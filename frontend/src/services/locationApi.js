// Free Location Service for Country, State, District, and Village / Town dropdowns
// Uses open free public APIs (CountriesNow API & Indian Postal Pincode API)
// with built-in instant offline/low-bandwidth fallback datasets.

// Comprehensive fallback list of Indian States & Union Territories
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export const POPULAR_COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'United Arab Emirates', 'Singapore', 'Saudi Arabia', 'Germany', 'France'
];

// Curated districts for major Indian States for instant 0ms selection
export const STATE_DISTRICTS = {
  'Uttar Pradesh': ['Varanasi', 'Lucknow', 'Kanpur Nagar', 'Prayagraj', 'Agra', 'Gorakhpur', 'Meerut', 'Ghaziabad', 'Gautam Buddha Nagar (Noida)', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Ayodhya', 'Jhansi', 'Mirzapur', 'Jaunpur', 'Ghazipur', 'Ballia', 'Basti', 'Mathura', 'Muzaffarnagar'],
  'Maharashtra': ['Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Nanded', 'Sangli', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Satara'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Danapur', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan', 'Motihari'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Raichur', 'Bidar', 'Hosapete', 'Udupi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Ranipet', 'Nagercoil', 'Thanjavur', 'Vellore', 'Kancheepuram', 'Erode', 'Dindigul'],
  'West Bengal': ['Kolkata', 'North 24 Parganas', 'South 24 Parganas', 'Howrah', 'Hooghly', 'Purba Medinipur', 'Paschim Medinipur', 'Purba Bardhaman', 'Paschim Bardhaman', 'Nadia', 'Murshidabad', 'Darjeeling', 'Jalpaiguri'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari', 'Morbi', 'Nadiad', 'Surendranagar', 'Bharuch'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Barmer', 'Chittorgarh'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Phagwara'],
  'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind'],
  'Kerala': ['Thiruvananthapuram', 'Kochi (Ernakulam)', 'Kozhikode', 'Kollam', 'Thrissur', 'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad', 'Manjeri', 'Thalassery', 'Malappuram'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Rajahmundry', 'Kadapa', 'Tirupati', 'Anantapur', 'Vizianagaram', 'Eluru'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Phusro', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chirkunda'],
  'Chhattisgarh': ['Raipur', 'Bhilai Nagar', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Dhamtari'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur']
};

/**
 * Fetch States list for a given country using free CountriesNow API
 */
export async function fetchStates(country = 'India') {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.data?.states?.length > 0) {
        return data.data.states.map(s => s.name);
      }
    }
  } catch {
    // Fallback gracefully to offline list
  }
  return country.toLowerCase() === 'india' ? INDIAN_STATES : ['State / Region 1', 'State / Region 2'];
}

/**
 * Fetch Districts / Cities for a given state using free CountriesNow API
 */
export async function fetchDistricts(country = 'India', state = '') {
  if (country.toLowerCase() === 'india' && STATE_DISTRICTS[state]) {
    return STATE_DISTRICTS[state];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, state }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.data?.length > 0) {
        return data.data;
      }
    }
  } catch {
    // Fallback
  }

  return STATE_DISTRICTS[state] || ['District Central', 'District North', 'District South', 'District East', 'District West'];
}

/**
 * Free Postal Pincode API lookup: returns villages/post-offices, district, and state from 6-digit PIN code.
 */
export async function lookupPostalPincode(pincode) {
  if (!pincode || pincode.trim().length !== 6) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode.trim()}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const offices = data[0].PostOffice;
        const state = offices[0].State;
        const district = offices[0].District;
        const villages = offices.map(o => o.Name);
        return { state, district, villages, raw: offices };
      }
    }
  } catch {
    // Failed or timeout
  }
  return null;
}
