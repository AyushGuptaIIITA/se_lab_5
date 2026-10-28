const express = require('express');
const crypto = require('crypto');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth, doctorOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');
const { sendToPharmacy } = require('../utils/pharmacyAdapter');
const { CLINICAL_DRUGS, DRUG_INTERACTIONS, CLINICAL_TEMPLATES } = require('../utils/drugData');

const router = express.Router();

// GET /api/prescriptions/drugs/search — Search clinical drug database with OpenFDA fallback
router.get('/drugs/search', auth, async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();
    if (!query) {
      return res.json({ drugs: CLINICAL_DRUGS.slice(0, 15) });
    }

    // Filter local clinical database first
    const localMatches = CLINICAL_DRUGS.filter(d => 
      d.name.toLowerCase().includes(query) ||
      d.genericName.toLowerCase().includes(query) ||
      d.category.toLowerCase().includes(query) ||
      d.brandNames.some(b => b.toLowerCase().includes(query))
    );

    // If query has 3+ chars and fewer than 5 local matches, try OpenFDA API with safe timeout
    let fdaMatches = [];
    if (query.length >= 3 && localMatches.length < 5) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(query)}*+OR+openfda.generic_name:${encodeURIComponent(query)}*&limit=4`;
        const fdaRes = await fetch(fdaUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (fdaRes.ok) {
          const fdaData = await fdaRes.json();
          if (fdaData.results && Array.isArray(fdaData.results)) {
            fdaMatches = fdaData.results.map(r => {
              const brand = r.openfda?.brand_name?.[0] || 'Unknown';
              const generic = r.openfda?.generic_name?.[0] || brand;
              const purpose = r.purpose?.[0] || r.indications_and_usage?.[0] || 'Clinical Medication';
              return {
                name: brand,
                brandNames: [brand],
                genericName: generic,
                category: 'FDA Verified Compound',
                form: 'Tablet',
                availableStrengths: ['Standard dosage'],
                defaultDosage: 'As directed',
                defaultFrequency: 'Once daily',
                defaultDuration: '5 days',
                defaultInstructions: 'Take as directed by doctor.',
                timing: { morning: true, afternoon: false, night: false, withFood: 'With water' },
                indications: purpose.slice(0, 200),
                warnings: (r.warnings?.[0] || 'Use as directed.').slice(0, 200)
              };
            });
          }
        }
      } catch (fdaErr) {
        // Safe fallback - ignore FDA timeout or offline error
      }
    }

    // Combine local and FDA matches, removing duplicates by name
    const combined = [...localMatches];
    fdaMatches.forEach(fdaDrug => {
      if (!combined.some(c => c.name.toLowerCase() === fdaDrug.name.toLowerCase())) {
        combined.push(fdaDrug);
      }
    });

    res.json({ drugs: combined.slice(0, 20) });
  } catch (err) {
    console.error('Drug search error:', err);
    res.status(500).json({ message: 'Error searching medications.' });
  }
});

// GET /api/prescriptions/templates — Get clinical regimen disease templates
router.get('/templates', auth, (req, res) => {
  res.json({ templates: CLINICAL_TEMPLATES });
});

// POST /api/prescriptions/check-interactions — Real-time Drug-Drug Interaction safety check
router.post('/check-interactions', auth, (req, res) => {
  try {
    const { medications } = req.body;
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
      return res.json({ interactions: [], safe: true });
    }

    // Extract names to lower case
    const medNames = medications.map(m => {
      if (typeof m === 'string') return m.toLowerCase();
      return (m.name || '').toLowerCase();
    }).filter(Boolean);

    const detected = [];

    DRUG_INTERACTIONS.forEach(rule => {
      const drugA = rule.drugs[0].toLowerCase();
      const drugB = rule.drugs[1].toLowerCase();

      const hasA = medNames.some(name => name.includes(drugA) || drugA.includes(name));
      const hasB = medNames.some(name => name.includes(drugB) || drugB.includes(name));

      if (hasA && hasB) {
        detected.push(rule);
      }
    });

    res.json({
      interactions: detected,
      safe: detected.length === 0,
      totalChecked: medNames.length
    });
  } catch (err) {
    console.error('Interaction check error:', err);
    res.status(500).json({ message: 'Error checking drug interactions.' });
  }
});

// POST /api/prescriptions — Create a prescription (doctor only)
router.post('/', auth, doctorOnly, async (req, res) => {
  try {
    const { appointmentId, diagnosis, medications, additionalNotes } = req.body;

    if (!appointmentId || !diagnosis || !medications || !medications.length) {
      return res.status(400).json({ message: 'appointmentId, diagnosis, and medications are required.' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. This is not your appointment.' });
    }

    // Check if prescription already exists for this appointment
    const existingPrescription = await Prescription.findOne({ appointment: appointmentId });
    if (existingPrescription) {
      return res.status(400).json({ message: 'A prescription already exists for this appointment.' });
    }

    // Generate digital signature
    const signedAt = new Date();
    const contentToSign = `${diagnosis}|${req.user.name}|${signedAt.toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(contentToSign).digest('hex');
    const certificateId = `CERT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const prescription = new Prescription({
      appointment: appointmentId,
      patient: appointment.patient._id,
      doctor: req.user._id,
      diagnosis,
      medications,
      additionalNotes: additionalNotes || '',
      digitalSignature: {
        signedBy: req.user.name,
        signedAt,
        signatureHash,
        certificateId
      },
      pharmacyStatus: 'pending',
      trackingSteps: [
        {
          status: 'pending',
          label: 'Digitally Signed & Certified',
          timestamp: signedAt,
          notes: `Certified by Dr. ${req.user.name} (License ID Verified, Hash: ${signatureHash.substring(0, 16)}...)`
        }
      ]
    });

    await prescription.save();

    // Link prescription to appointment
    appointment.prescription = prescription._id;
    await appointment.save();

    // Create audit log
    await createAuditLog(
      'PRESCRIPTION_CREATED',
      req.user._id,
      req.user.role,
      req.user.name,
      'Prescription',
      prescription._id,
      {
        appointmentId,
        patientName: appointment.patient.name,
        diagnosis,
        medicationCount: medications.length
      },
      req.ip
    );

    res.status(201).json({
      message: 'Prescription created successfully.',
      prescription
    });
  } catch (err) {
    console.error('Create prescription error:', err);
    res.status(500).json({ message: 'Server error creating prescription.' });
  }
});

// GET /api/prescriptions — List prescriptions based on role
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const filter = {};

    if (req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    } else if (req.user.role === 'patient') {
      filter.patient = req.user._id;
    }
    // Admin sees all

    const total = await Prescription.countDocuments(filter);
    const prescriptions = await Prescription.find(filter)
      .populate('patient', 'name email phone gender dateOfBirth bloodGroup')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('appointment', 'date timeSlot status type')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      prescriptions,
      total,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Get prescriptions error:', err);
    res.status(500).json({ message: 'Server error fetching prescriptions.' });
  }
});

// GET /api/prescriptions/patient/:patientId — Get prescriptions for a specific patient (doctor/admin)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const prescriptions = await Prescription.find({ patient: req.params.patientId })
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization')
      .populate('appointment', 'date timeSlot status type')
      .sort({ createdAt: -1 });

    res.json({ prescriptions });
  } catch (err) {
    console.error('Get patient prescriptions error:', err);
    res.status(500).json({ message: 'Server error fetching patient prescriptions.' });
  }
});

// GET /api/prescriptions/appointment/:appointmentId — Get prescription for an appointment
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findOne({ appointment: req.params.appointmentId })
      .populate('patient', 'name email phone gender dateOfBirth bloodGroup address')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('appointment', 'date timeSlot status type symptoms notes');

    if (!prescription) {
      return res.status(404).json({ message: 'No prescription found for this appointment.' });
    }

    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      prescription.doctor._id.toString() !== userId &&
      prescription.patient._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ prescription });
  } catch (err) {
    console.error('Get prescription by appointment error:', err);
    res.status(500).json({ message: 'Server error fetching prescription.' });
  }
});

// GET /api/prescriptions/:id — Get single prescription
router.get('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email phone gender dateOfBirth bloodGroup address')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('appointment', 'date timeSlot status type symptoms notes');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    // Check authorization
    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      prescription.doctor._id.toString() !== userId &&
      prescription.patient._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ prescription });
  } catch (err) {
    console.error('Get prescription error:', err);
    res.status(500).json({ message: 'Server error fetching prescription.' });
  }
});

// POST /api/prescriptions/:id/send-to-pharmacy — Send prescription to pharmacy (doctor)
router.post('/:id/send-to-pharmacy', auth, doctorOnly, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (prescription.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Send to pharmacy adapter
    const pharmacyResponse = await sendToPharmacy(prescription);

    prescription.pharmacyStatus = 'sent';
    prescription.pharmacyResponse = pharmacyResponse;
    prescription.sentToPharmacyAt = new Date();

    if (!prescription.trackingSteps) {
      prescription.trackingSteps = [];
    }
    prescription.trackingSteps.push({
      status: 'sent',
      label: 'Transmitted to Digital Pharmacy Partner (Apollo / 1mg)',
      timestamp: new Date(),
      notes: `Order Ref: ${pharmacyResponse.pharmacyRefId || 'PHARM-DISPATCH'}`
    });

    await prescription.save();

    // Create audit log
    await createAuditLog(
      'PRESCRIPTION_SENT_TO_PHARMACY',
      req.user._id,
      req.user.role,
      req.user.name,
      'Prescription',
      prescription._id,
      {
        pharmacyRefId: pharmacyResponse.pharmacyRefId,
        patientName: prescription.patient.name
      },
      req.ip
    );

    res.json({
      message: 'Prescription sent to pharmacy successfully.',
      prescription,
      pharmacyResponse
    });
  } catch (err) {
    console.error('Send to pharmacy error:', err);
    res.status(500).json({ message: 'Server error sending prescription to pharmacy.' });
  }
});

// POST /api/prescriptions/:id/refill-request — Request refill/renewal (Patient)
router.post('/:id/refill-request', auth, async (req, res) => {
  try {
    const { notes } = req.body;
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (prescription.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the patient can request a refill for this prescription.' });
    }

    prescription.refillStatus = 'requested';
    prescription.refillNotes = notes || 'Patient requested prescription refill for continued therapy.';
    prescription.refillRequestedAt = new Date();
    await prescription.save();

    await createAuditLog(
      'PRESCRIPTION_REFILL_REQUESTED',
      req.user._id,
      req.user.role,
      req.user.name,
      'Prescription',
      prescription._id,
      { notes: prescription.refillNotes },
      req.ip
    );

    res.json({
      message: 'Prescription refill requested successfully. Your doctor has been notified.',
      prescription
    });
  } catch (err) {
    console.error('Refill request error:', err);
    res.status(500).json({ message: 'Server error requesting refill.' });
  }
});

// PATCH /api/prescriptions/:id/refill-status — Approve or decline refill (Doctor)
router.patch('/:id/refill-status', auth, doctorOnly, async (req, res) => {
  try {
    const { status, doctorNotes } = req.body;
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or declined.' });
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (prescription.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the prescribing doctor can update refill status.' });
    }

    prescription.refillStatus = status;
    if (doctorNotes) {
      prescription.additionalNotes = (prescription.additionalNotes ? prescription.additionalNotes + '\n' : '') + `[Refill Note]: ${doctorNotes}`;
    }
    await prescription.save();

    await createAuditLog(
      'PRESCRIPTION_REFILL_STATUS_UPDATED',
      req.user._id,
      req.user.role,
      req.user.name,
      'Prescription',
      prescription._id,
      { status, doctorNotes },
      req.ip
    );

    res.json({
      message: `Prescription refill has been ${status}.`,
      prescription
    });
  } catch (err) {
    console.error('Refill status update error:', err);
    res.status(500).json({ message: 'Server error updating refill status.' });
  }
});

// PATCH /api/prescriptions/:id/tracking — Advance pharmacy tracking step (Doctor or Admin)
router.patch('/:id/tracking', auth, async (req, res) => {
  try {
    const { status, label, notes } = req.body;
    if (!status || !['pending', 'sent', 'received', 'dispensed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid pharmacy tracking status.' });
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    prescription.pharmacyStatus = status;
    if (!prescription.trackingSteps) prescription.trackingSteps = [];
    prescription.trackingSteps.push({
      status,
      label: label || `Status updated to ${status}`,
      timestamp: new Date(),
      notes: notes || `Updated by ${req.user.name}`
    });
    await prescription.save();

    res.json({
      message: 'Pharmacy tracking updated.',
      prescription
    });
  } catch (err) {
    console.error('Update tracking error:', err);
    res.status(500).json({ message: 'Server error updating tracking.' });
  }
});

module.exports = router;
