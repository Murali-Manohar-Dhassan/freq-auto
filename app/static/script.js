// Counter for manually added stations to ensure unique IDs
let manualStationCount = 0;

// Station lookup data (ensure this is defined in your actual script)
const stationLookup = {
  "CSTM": { name: "CHHATRAPATI Shivaji Terminus", division: "Mumbai", state: "Maharastra", latitude: 18.9398, longitude: 72.8355 },
  "KYN": { name: "Kalyan", division: "Mumbai", state: "Maharastra", latitude: 19.2437, longitude: 73.1277 },
  "PNVL": { name: "Panvel", division: "Mumbai", state: "Maharastra", latitude: 18.9886, longitude: 73.1108 },
  "NK": { name: "Nasik Road", division: "Bhusawal", state: "Maharastra", latitude: 19.9773, longitude: 73.8009 },
  "SUR": { name: "Solapur", division: "Solapur", state: "Maharastra", latitude: 17.6599, longitude: 75.9064 },
  "MMR": { name: "Manmad", division: "Bhusawal", state: "Maharastra", latitude: 20.2539, longitude: 74.4370 },
  "GR": { name: "Gulbarga", division: "Solapur", state: "Maharastra", latitude: 17.3356, longitude: 76.8374 },
  "AK": { name: "Akola", division: "Bhusawal", state: "Maharastra", latitude: 20.7096, longitude: 76.9981 },
  "JL": { name: "Jalgaon", division: "Bhusawal", state: "Maharastra", latitude: 21.0077, longitude: 75.5626 },
  "MRJ": { name: "Miraj", division: "Pune", state: "Maharastra", latitude: 16.8232, longitude: 74.6412 },
  "SNSI": { name: "Sainagar Sirdi", division: "Solapur", state: "Maharastra", latitude: 19.7666, longitude: 74.4770 },
  "KOP": { name: "Kolhapur", division: "Pune", state: "Maharastra", latitude: 16.7090, longitude: 74.2433 },
  "BD": { name: "Badnera", division: "Bhusawal", state: "Maharastra", latitude: 20.8777, longitude: 77.7567 },
  "KNW": { name: "Khandawa", division: "Bhusawal", state: "Maharastra", latitude: 21.8304, longitude: 76.3494 },
  "KPG": { name: "Kopargaon", division: "Solapur", state: "Maharastra", latitude: 19.8883, longitude: 74.4825 },
  "DD": { name: "Daud", division: "Solapur", state: "Maharastra", latitude: 18.4667, longitude: 74.5695 },
  "ANG": { name: "Ahmad Nagar", division: "Solapur", state: "Maharastra", latitude: 19.0948, longitude: 74.7384 },
  "WR": { name: "Wardha", division: "Nagpur", state: "Maharastra", latitude: 20.7432, longitude: 78.5970 },
  "SEG": { name: "Shegaon", division: "Bhusawal", state: "Maharastra", latitude: 20.7930, longitude: 76.6997 },
  "AMI": { name: "Amrawati", division: "Bhusawal", state: "Maharastra", latitude: 20.9374, longitude: 77.7796 },
  "BPQ": { name: "Balharshah", division: "Nagpur", state: "Maharastra", latitude: 19.8410, longitude: 79.3428 },
  "LNL": { name: "Lonavala", division: "Mumbai", state: "Maharastra", latitude: 18.7481, longitude: 73.4072 },
  "CD": { name: "Chandrapur", division: "Nagpur", state: "Maharastra", latitude: 19.9615, longitude: 79.2961 },
  "LUR": { name: "Latur", division: "Solapur", state: "Maharastra", latitude: 18.3988, longitude: 76.5702 },
  "BZU": { name: "Betul", division: "Nagpur", state: "Madhya Pradesh", latitude: 21.9026, longitude: 77.9055 },
  "BAU": { name: "Burhanpur", division: "Bhusawal", state: "Madhya Pradesh", latitude: 21.3088, longitude: 76.2221 },
  "KWV": { name: "Kurduwadi", division: "Solapur", state: "Maharastra", latitude: 18.0830, longitude: 75.4300 },
  "CSN": { name: "Chalisgaon", division: "Bhusawal", state: "Maharastra", latitude: 20.4590, longitude: 74.9983 },
  "MKU": { name: "Malkapur", division: "Bhusawal", state: "Maharastra", latitude: 20.8891, longitude: 76.2014 },
  "SEGM": { name: "Sewagram", division: "Nagpur", state: "Maharastra", latitude: 20.7516, longitude: 78.6442 },
  "BIRD": { name: "Bhiwandi Road", division: "Mumbai", state: "Maharastra", latitude: 19.2813, longitude: 73.0483 },
  "WADI": { name: "Wadi", division: "Solapur", state: "Maharastra", latitude: 17.0592, longitude: 76.9900 },
  "DI": { name: "Dombivli", division: "Mumbai", state: "Maharastra", latitude: 19.2167, longitude: 73.0833 },
  "BUD": { name: "Badlapur", division: "Mumbai", state: "Maharastra", latitude: 19.1660, longitude: 73.2367 },
  "GC": { name: "Ghatkopar", division: "Mumbai", state: "Maharastra", latitude: 19.0865, longitude: 72.9090 },
  "CLA": { name: "Kurla", division: "Mumbai", state: "Maharastra", latitude: 19.0726, longitude: 72.8856 },
  "ABH": { name: "Ambarnath", division: "Mumbai", state: "Maharastra", latitude: 19.1844, longitude: 73.2270 },
  "MNKD": { name: "Mankhurd", division: "Mumbai", state: "Maharastra", latitude: 19.0485, longitude: 72.9210 },
  "MLND": { name: "Mulund", division: "Mumbai", state: "Maharastra", latitude: 19.1725, longitude: 72.9608 },
  "MBQ": { name: "Mumbra", division: "Mumbai", state: "Maharastra", latitude: 19.0360, longitude: 73.0158 },
  "BEPR": { name: "Belapur", division: "Mumbai", state: "Maharastra", latitude: 19.0204, longitude: 73.0260 },
  "TLA": { name: "Titwala", division: "Mumbai", state: "Maharastra", latitude: 19.6608, longitude: 73.1509 },
  "BND": { name: "Bhandup", division: "Mumbai", state: "Maharastra", latitude: 19.1497, longitude: 72.9330 },
  "NEU": { name: "Nerul", division: "Mumbai", state: "Maharastra", latitude: 19.0335, longitude: 73.0199 },
  "VSH": { name: "Vashi", division: "Mumbai", state: "Maharastra", latitude: 19.0702, longitude: 73.0007 },
  "KHAG": { name: "Kharghar", division: "Mumbai", state: "Maharastra", latitude: 19.0444, longitude: 73.0695 },
  "GV": { name: "Govandi", division: "Mumbai", state: "Maharastra", latitude: 19.0481, longitude: 72.9183 },
  "ULNR": { name: "Ulhasnagar", division: "Mumbai", state: "Maharastra", latitude: 19.2163, longitude: 73.1644 },
  "VK": { name: "Vikhroli", division: "Mumbai", state: "Maharastra", latitude: 19.1066, longitude: 72.9311 },
  "KLVA": { name: "Kalwa", division: "Mumbai", state: "Maharastra", latitude: 19.1870, longitude: 72.9991 },
  "BY": { name: "Byculla", division: "Mumbai", state: "Maharastra", latitude: 18.9802, longitude: 72.8323 },
  "SIN": { name: "Sion", division: "Mumbai", state: "Maharastra", latitude: 19.0396, longitude: 72.8665 },
  "AIRL": { name: "Airoli", division: "Mumbai", state: "Maharastra", latitude: 19.1571, longitude: 72.9964 },
  "KJT": { name: "Karjat", division: "Mumbai", state: "Maharastra", latitude: 18.9096, longitude: 73.3235 },
  "CMBR": { name: "Chembur", division: "Mumbai", state: "Maharastra", latitude: 19.0488, longitude: 72.9101 },
  "GTBN": { name: "Guru Teg Bahadur Nagar", division: "Mumbai", state: "Maharastra", latitude: 19.0732, longitude: 72.8603 },
  "GNSL": { name: "Ghansoli", division: "Mumbai", state: "Maharastra", latitude: 19.1234, longitude: 73.0076 },
  "MANR": { name: "Mansarovar", division: "Mumbai", state: "Maharastra", latitude: 19.0136, longitude: 73.0666 },
  "SNCR": { name: "Sanpada", division: "Mumbai", state: "Maharastra", latitude: 19.0692, longitude: 73.0166 },
  "SDAH": { name: "Sealdah", division: "Sealdah", state: "West Bengal", latitude: 22.5675, longitude: 88.3700 },
  "KOAA": { name: "Kolkata Terminal", division: "Sealdah", state: "West Bengal", latitude: 22.5745, longitude: 88.3700 },
  "BGP": { name: "Bhagalpur", division: "Maldah", state: "Bihar", latitude: 25.2437, longitude: 86.9848 },
  "ASN": { name: "Asansol", division: "Asansol", state: "West Bengal", latitude: 23.6833, longitude: 86.9833 },
  "BWN": { name: "Barddhman", division: "Howrah", state: "West Bengal", latitude: 23.2324, longitude: 87.8633 },
  "NH": { name: "Naihati", division: "Sealdah", state: "West Bengal", latitude: 22.8942, longitude: 88.4181 },
  "MLDT": { name: "Malda Town", division: "Maldah", state: "West Bengal", latitude: 25.0110, longitude: 88.1410 },
  "JSME": { name: "Jasidih", division: "Asansol", state: "Jharkhand", latitude: 24.5132, longitude: 86.6456 },
  "DGR": { name: "Durgapur", division: "Asansol", state: "West Bengal", latitude: 23.5204, longitude: 87.3119 },
  "JMP": { name: "Jamalpur", division: "Maldah", state: "Bihar", latitude: 25.3132, longitude: 86.4890 },
  "RPH": { name: "Rampurhat", division: "Howrah", state: "West Bengal", latitude: 24.1761, longitude: 87.7918 },
  "BDC": { name: "Bandel Jn.", division: "Howrah", state: "West Bengal", latitude: 22.9284, longitude: 88.3841 },
  "NFK": { name: "New Farakka", division: "Maldah", state: "West Bengal", latitude: 25.0362, longitude: 88.2461 },
  "MDP": { name: "Madhupur", division: "Asansol", state: "Jharkhand", latitude: 24.2672, longitude: 86.6425 },
  "BHP": { name: "Bolpur", division: "Howrah", state: "West Bengal", latitude: 23.6576, longitude: 87.6961 },
  "BPC": { name: "Berhampur Court", division: "Sealdah", state: "West Bengal", latitude: 24.0984, longitude: 88.2672 },
  "SGG": { name: "Sultanganj", division: "Maldah", state: "Bihar", latitude: 25.2631, longitude: 86.7459 },
  "RNG": { name: "Raniganj", division: "Asansol", state: "West Bengal", latitude: 23.6254, longitude: 87.1340 },
  "UDL": { name: "Andal", division: "Asansol", state: "West Bengal", latitude: 23.6001, longitude: 87.1203 },
  "KNJ": { name: "Krishnanagar City", division: "Sealdah", state: "West Bengal", latitude: 23.4026, longitude: 88.4993 },
  "BP": { name: "Barackpur", division: "Sealdah", state: "West Bengal", latitude: 22.7678, longitude: 88.3762 },
  "SPR": { name: "Srirampur", division: "Howrah", state: "West Bengal", latitude: 22.7528, longitude: 88.3427 },
  "DDJ": { name: "Dum Dum Jn.", division: "Sealdah", state: "West Bengal", latitude: 22.6295, longitude: 88.4225 },
  "SEP": { name: "Sodepur", division: "Sealdah", state: "West Bengal", latitude: 22.6953, longitude: 88.4082 },
  "BRP": { name: "Baruipur Jn.", division: "Sealdah", state: "West Bengal", latitude: 22.3660, longitude: 88.4394 },
  "SRP": { name: "Srirampur", division: "Howrah", state: "West Bengal", latitude: 22.7480, longitude: 88.3401 },
  "RIS": { name: "Rishra", division: "Howrah", state: "West Bengal", latitude: 22.7502, longitude: 88.3451 },
  "KOG": { name: "Konnagar", division: "Howrah", state: "West Bengal", latitude: 22.7053, longitude: 88.3514 },
  "BT": { name: "Barasat Jn.", division: "Sealdah", state: "West Bengal", latitude: 22.7228, longitude: 88.4828 },
  "BLH": { name: "Belghoria", division: "Sealdah", state: "West Bengal", latitude: 22.6516, longitude: 88.3771 },
  "SBGR": { name: "Subhasgram", division: "Sealdah", state: "West Bengal", latitude: 22.4098, longitude: 88.4356 },
  "SNR": { name: "Shyamnagar", division: "Sealdah", state: "West Bengal", latitude: 22.8266, longitude: 88.3666 },
  "BNXR": { name: "Bidhannagar", division: "Sealdah", state: "West Bengal", latitude: 22.5854, longitude: 88.4011 },
  "HB": { name: "Habra", division: "Sealdah", state: "West Bengal", latitude: 22.8388, longitude: 88.6442 },
  "MMG": { name: "Madhyamgram", division: "Sealdah", state: "West Bengal", latitude: 22.6953, longitude: 88.4480 },
  "SHE": { name: "Sheoraphuli", division: "Howrah", state: "West Bengal", latitude: 22.7519, longitude: 88.3217 },
  "RHA": { name: "Ranaghat Jn.", division: "Sealdah", state: "West Bengal", latitude: 23.1736, longitude: 88.5631 },
  "KDH": { name: "Khardah", division: "Sealdah", state: "West Bengal", latitude: 22.7058, longitude: 88.3794 },
  "CDH": { name: "Chakdah", division: "Sealdah", state: "West Bengal", latitude: 23.2560, longitude: 88.5269 },
  "PNBE": { name: "Patna", division: "Danapur", state: "Bihar", latitude: 25.6121, longitude: 85.1343 },
  "MFP": { name: "Muzaffarpur", division: "Sonepur", state: "Bihar", latitude: 26.1209, longitude: 85.3906 },
  "MGS": { name: "Mughalsarai", division: "Mughalsarai", state: "Uttar Pradesh", latitude: 25.2887, longitude: 83.0094 },
  "GAYA": { name: "Gaya", division: "Mughalsarai", state: "Bihar", latitude: 24.7914, longitude: 85.0044 },
  "DHN": { name: "Dhanbad", division: "Dhanbad", state: "Jharkhand", latitude: 23.8016, longitude: 86.4432 },
  "DBG": { name: "Darbhanga", division: "Samastipur", state: "Bihar", latitude: 26.1521, longitude: 85.8977 },
  "RJPB": { name: "Rajendra Nagar Terminal", division: "Danapur", state: "Bihar", latitude: 25.6119, longitude: 85.1494 },
  "PPTA": { name: "Patliputra", division: "Danapur", state: "Bihar", latitude: 25.6121, longitude: 85.1207 },
  "SPJ": { name: "Samastipur", division: "Samastipur", state: "Bihar", latitude: 25.8605, longitude: 85.7820 },
  "SHC": { name: "Saharsa", division: "Samastipur", state: "Bihar", latitude: 25.8774, longitude: 86.5998 },
  "ARA": { name: "Ara", division: "Danapur", state: "Bihar", latitude: 25.5560, longitude: 84.6635 },
  "BXR": { name: "Buxar", division: "Danapur", state: "Bihar", latitude: 25.5647, longitude: 83.9784 },
  "DNR": { name: "Danapur", division: "Danapur", state: "Bihar", latitude: 25.6173, longitude: 85.0497 },
  "BJU": { name: "Barauni Jn.", division: "Sonepur", state: "Bihar", latitude: 25.4755, longitude: 86.0409 },
  "HJP": { name: "Hajipur", division: "Sonepur", state: "Bihar", latitude: 25.6857, longitude: 85.2133 },
  "KQR": { name: "Koderma", division: "Dhanbad", state: "Jharkhand", latitude: 24.4694, longitude: 85.5449 },
  "BMKI": { name: "Banmankhi", division: "Samastipur", state: "Bihar", latitude: 25.8775, longitude: 87.1343 },
  "DOS": { name: "Dehri On Sone", division: "Mughalsarai", state: "Bihar", latitude: 24.8977, longitude: 84.1863 },
  "KIUL": { name: "Kiul", division: "Danapur", state: "Bihar", latitude: 25.1076, longitude: 86.1190 },
  "KGG": { name: "Khagaria", division: "Sonepur", state: "Bihar", latitude: 25.5021, longitude: 86.4764 },
  "RXL": { name: "Raxaul", division: "Samastipur", state: "Bihar", latitude: 26.9794, longitude: 84.8585 },
  "SSM": { name: "Sasaram", division: "Mughalsarai", state: "Bihar", latitude: 24.9507, longitude: 84.0191 },
  "BTH": { name: "Bettiah", division: "Samastipur", state: "Bihar", latitude: 26.8029, longitude: 84.5033 },
  "JYG": { name: "Jainagar", division: "Samastipur", state: "Bihar", latitude: 26.5851, longitude: 86.1339 },
  "PNME": { name: "Parasnath", division: "Dhanbad", state: "Jharkhand", latitude: 23.9721, longitude: 86.1466 },
  "MBI": { name: "Madhubani", division: "Samastipur", state: "Bihar", latitude: 26.3639, longitude: 86.0705 },
  "DTO": { name: "Daltonganj", division: "Dhanbad", state: "Jharkhand", latitude: 24.0317, longitude: 84.0687 },
  "BKP": { name: "Bakhtiyarpur", division: "Danapur", state: "Bihar", latitude: 25.4612, longitude: 85.5317 },
  "AUBR": { name: "Anugrah Narayan Road", division: "Mughalsarai", state: "Bihar", latitude: 24.6474, longitude: 84.8188 },
  "SGL": { name: "Sugauli", division: "Samastipur", state: "Bihar", latitude: 26.7623, longitude: 84.8553 },
  "NKE": { name: "Narkatiaganj", division: "Samastipur", state: "Bihar", latitude: 27.1125, longitude: 84.4747 },
  "BGS": { name: "Begusarai", division: "Sonepur", state: "Bihar", latitude: 25.4186, longitude: 86.1337 },
  "SKI": { name: "Sakari Jn.", division: "Samastipur", state: "Bihar", latitude: 26.4045, longitude: 86.1954 },
  "PNC": { name: "Patna Sahib", division: "Danapur", state: "Bihar", latitude: 25.6121, longitude: 85.2303 },
  "SMI": { name: "Sitamadhi", division: "Samastipur", state: "Bihar", latitude: 26.5950, longitude: 85.4927 },
  "JMU": { name: "Jamui", division: "Danapur", state: "Bihar", latitude: 24.9211, longitude: 86.2246 },
  "MKA": { name: "Mokama", division: "Danapur", state: "Bihar", latitude: 25.3960, longitude: 86.0844 },
  "JAJ": { name: "Jhanja", division: "Danapur", state: "Bihar", latitude: 25.5060, longitude: 86.4771 },
  "SGRL": { name: "Singrauli", division: "Dhanbad", state: "Madhya Pradesh", latitude: 24.2010, longitude: 82.6621 },
  "BBU": { name: "Bhabhua Road", division: "Mughalsarai", state: "Bihar", latitude: 25.0506, longitude: 83.5636 },
  "GHD": { name: "Garhwa Road", division: "Dhanbad", state: "Jharkhand", latitude: 24.1642, longitude: 83.8114 },
  "MNE": { name: "Mansi Jn.", division: "Sonepur", state: "Bihar", latitude: 25.4783, longitude: 86.5397 },
  "DLN": { name: "Dildarnagar", division: "Danapur", state: "Uttar Pradesh", latitude: 25.4218, longitude: 83.6685 },
  "BUG": { name: "Bagha", division: "Samastipur", state: "Bihar", latitude: 27.1007, longitude: 84.0584 },
  "NNA": { name: "Naugachia", division: "Sonepur", state: "Bihar", latitude: 25.4056, longitude: 87.0987 },
  "SEE": { name: "Sonepur", division: "Sonepur", state: "Bihar", latitude: 25.7096, longitude: 85.1719 },
  "BRKA": { name: "Barkakana", division: "Dhanbad", state: "Jharkhand", latitude: 23.6203, longitude: 85.4916 },
  "JHD": { name: "Jahanabad", division: "Danapur", state: "Bihar", latitude: 25.2135, longitude: 84.9858 },
  "TEA": { name: "Taregana", division: "Danapur", state: "Bihar", latitude: 25.5019, longitude: 85.2326 },
  "FUT": { name: "Fatuha", division: "Danapur", state: "Bihar", latitude: 25.5098, longitude: 85.2381 },
  "BTA": { name: "Bihta", division: "Danapur", state: "Bihar", latitude: 25.5932, longitude: 84.8734 },
  "BARH": { name: "Barh", division: "Danapur", state: "Bihar", latitude: 25.4777, longitude: 85.7089 },
  "PURI": { name: "Puri", division: "Khurdh Road", state: "Orissa", latitude: 19.8045, longitude: 85.8181 },
  "BAM": { name: "Brahmapur", division: "Khurdh Road", state: "Orissa", latitude: 19.3111, longitude: 84.7920 },
  "CTC": { name: "Cuttack", division: "Khurdh Road", state: "Orissa", latitude: 20.4625, longitude: 85.8828 },
  "VZM": { name: "Vizianagaram", division: "Waltair", state: "Andhra Pradesh", latitude: 18.1134, longitude: 83.4214 },
  "SBP": { name: "Sambalpur", division: "Sambalpur", state: "Orissa", latitude: 21.4651, longitude: 83.9810 },
  "KUR": { name: "Khurda Road", division: "Khurda Road", state: "Orissa", latitude: 20.1578, longitude: 85.7070 },
  "CHE": { name: "Srikakulam", division: "Waltair", state: "Andhra Pradesh", latitude: 18.2988, longitude: 83.9028 },
  "BHC": { name: "Bhadrak", division: "Khurda Road", state: "Orissa", latitude: 21.0575, longitude: 86.5180 },
  "PSA": { name: "Palasa", division: "Khurda Road", state: "Andhra Pradesh", latitude: 18.7712, longitude: 84.4315 },
  "RGDA": { name: "Rayagada", division: "Waltair", state: "Orissa", latitude: 19.1711, longitude: 83.4151 },
  "JJKR": { name: "Jajpur-Keonjhar Road", division: "Khurda Road", state: "Orissa", latitude: 20.8501, longitude: 86.3142 },
  "DVD": { name: "Duvvada", division: "Waltair", state: "Andhra Pradesh", latitude: 17.7304, longitude: 83.2288 },
  "BLGR": { name: "Bolangir", division: "Sambalpur", state: "Chhattisgarh", latitude: 20.7131, longitude: 83.4804 },
  "TIG": { name: "Titlagarh", division: "Sambalpur", state: "Orissa", latitude: 20.2896, longitude: 83.1745 },
  "BALU": { name: "Balugaon", division: "Khurda Road", state: "Orissa", latitude: 19.7601, longitude: 85.3871 },
  "KSNG": { name: "Kesinga", division: "Sambalpur", state: "Orissa", latitude: 20.1844, longitude: 83.2256 },
  "DLI": { name: "Delhi", division: "Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.2090 },
  "JAT": { name: "Jammu Tawi", division: "Firozpur", state: "Jammu & Kashmir", latitude: 32.7357, longitude: 74.8691 },
  "BSB": { name: "Varanasi", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.3176, longitude: 82.9739 },
  "LKO": { name: "Lucknow", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.8467, longitude: 80.9462 },
  "LDH": { name: "Ludhiana Jn", division: "Firozpur", state: "Punjab", latitude: 30.9009, longitude: 75.8573 },
  "HW": { name: "Haridwar", division: "Moradabad", state: "Uttarakhand", latitude: 29.9457, longitude: 78.1642 },
  "UMB": { name: "Ambala Cantt.", division: "Ambala", state: "Haryana", latitude: 30.3782, longitude: 76.7723 },
  "SNP": { name: "Sonipat", division: "Delhi", state: "Haryana", latitude: 28.9959, longitude: 77.0194 },
  "BE": { name: "Bareilly", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.3670, longitude: 79.4304 },
  "DDN": { name: "Dehradun", division: "Moradabad", state: "Uttarakhand", latitude: 30.3165, longitude: 78.0322 },
  "SVDK": { name: "Shri Mata Vaishno Devi Katra", division: "Firozpur", state: "Jammu & Kashmir", latitude: 32.9860, longitude: 74.9481 },
  "MB": { name: "Moradabad", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.8319, longitude: 78.7737 },
  "SRE": { name: "Saharanpur", division: "Ambala", state: "Uttar Pradesh", latitude: 29.9674, longitude: 77.5456 },
  "FD": { name: "Faizabad", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.7755, longitude: 82.1500 },
  "BTI": { name: "Bathinda", division: "Ambala", state: "Punjab", latitude: 30.2100, longitude: 74.9455 },
  "PTKC": { name: "Pathankot Jn", division: "Firozpur", state: "Punjab", latitude: 32.2731, longitude: 75.6529 },
  "MTC": { name: "Meerut City", division: "Delhi", state: "Uttar Pradesh", latitude: 28.9800, longitude: 77.7002 },
  "SLN": { name: "Sultanpur", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.2648, longitude: 82.0727 },
  "JRC": { name: "Jalandhar City", division: "Firozpur", state: "Punjab", latitude: 31.3260, longitude: 75.5762 },
  "SPN": { name: "Shahjahanpur", division: "Moradabad", state: "Uttar Pradesh", latitude: 27.8777, longitude: 79.9121 },
  "KLK": { name: "Kalka", division: "Ambala", state: "Haryana", latitude: 30.8324, longitude: 76.9230 },
  "PBH": { name: "Pratapgarh", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.8975, longitude: 81.9763 },
  "SHG": { name: "Shahganj", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.0509, longitude: 82.6824 },
  "FZR": { name: "Firozpur Cantt", division: "Firozpur", state: "Punjab", latitude: 30.9335, longitude: 74.6252 },
  "JNU": { name: "Jaunpur", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.7461, longitude: 82.6834 },
  "ABP": { name: "Akbarpur", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.4369, longitude: 79.9900 },
  "RBL": { name: "Raebareli", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.2307, longitude: 81.2345 },
  "RK": { name: "Roorkee", division: "Moradabad", state: "Uttarakhand", latitude: 29.8543, longitude: 77.8880 },
  "ROK": { name: "Rohtak", division: "Delhi", state: "Haryana", latitude: 28.8955, longitude: 76.6066 },
  "HRI": { name: "Raichu", division: "Moradabad", state: "Uttar Pradesh", latitude: 26.7500, longitude: 82.2500 },
  "MOZ": { name: "Muzaffarnagar", division: "Delhi", state: "Uttar Pradesh", latitude: 29.4730, longitude: 77.7044 },
  "PGW": { name: "Phagwara Jn.", division: "Firozpur", state: "Punjab", latitude: 31.2189, longitude: 75.7717 },
  "PWL": { name: "Palwal", division: "Delhi", state: "Haryana", latitude: 28.1417, longitude: 77.3286 },
  "RMU": { name: "Rampur", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.8120, longitude: 79.0262 },
  "UHP": { name: "Udhampur", division: "Firozpur", state: "Jammu & Kashmir", latitude: 32.9235, longitude: 75.1447 },
  "BOY": { name: "Bhadohi", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.3946, longitude: 82.5695 },
  "RPJ": { name: "Raj Pura", division: "Ambala", state: "Punjab", latitude: 30.4859, longitude: 76.5911 },
  "JNH": { name: "Janghai", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.4896, longitude: 82.4370 },
  "PRG": { name: "Prayag", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.4383, longitude: 81.8330 },
  "PTK": { name: "Pathankot Jn", division: "Firozpur", state: "Punjab", latitude: 32.2731, longitude: 75.6529 },
  "HPU": { name: "Hapur", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.7137, longitude: 77.7836 },
  "ON": { name: "Unnao", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.5400, longitude: 80.4870 },
  "SIR": { name: "Sirhind", division: "Ambala", state: "Punjab", latitude: 30.6481, longitude: 76.3772 },
  "KKDE": { name: "Kurukshetra", division: "Delhi", state: "Haryana", latitude: 29.9695, longitude: 76.8783 },
  "BBK": { name: "Barabanki", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.9294, longitude: 81.1837 },
  "JOP": { name: "Jaunpur City", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.7461, longitude: 82.6834 },
  "PTA": { name: "Patiala", division: "Ambala", state: "Punjab", latitude: 30.3398, longitude: 76.3869 },
  "BVH": { name: "Ballabhgarh", division: "Delhi", state: "Haryana", latitude: 28.3569, longitude: 77.3243 },
  "AY": { name: "Ayodhya", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.7926, longitude: 82.1991 },
  "AME": { name: "Amethi", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.1514, longitude: 81.8159 },
  "CH": { name: "Chandausi", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.4553, longitude: 78.7743 },
  "NBD": { name: "Najibabad", division: "Moradabad", state: "Uttar Pradesh", latitude: 29.6114, longitude: 78.4323 },
  "ABS": { name: "Abhohar Jn", division: "Ambala", state: "Punjab", latitude: 30.1445, longitude: 74.2005 },
  "SBB": { name: "Sahibabad", division: "Delhi", state: "Uttar Pradesh", latitude: 28.6833, longitude: 77.4000 },
  "BGZ": { name: "Bahadurgarh", division: "Delhi", state: "Haryana", latitude: 28.6892, longitude: 76.9354 },
  "NNO": { name: "Nangloi", division: "Delhi", state: "Delhi", latitude: 28.6781, longitude: 77.0672 },
  "NUR": { name: "Narela", division: "Delhi", state: "Delhi", latitude: 28.8429, longitude: 77.0923 },
  "TKD": { name: "Tughlakabad", division: "Delhi", state: "Delhi", latitude: 28.4945, longitude: 77.2612 },
  "MDNR": { name: "Modinagar", division: "Delhi", state: "Uttar Pradesh", latitude: 28.8333, longitude: 77.5833 },
  "NOLI": { name: "Noli", division: "Delhi", state: "Uttar Pradesh", latitude: 28.7500, longitude: 77.2833 },
  "GNU": { name: "Ganaur", division: "Delhi", state: "Haryana", latitude: 29.0800, longitude: 77.0200 },
  "FDN": { name: "Faridabad New Town", division: "Delhi", state: "Haryana", latitude: 28.4000, longitude: 77.3000 },
  "PTRD": { name: "Pataudi Road", division: "Delhi", state: "Haryana", latitude: 28.3200, longitude: 76.7800 },
  "BTU": { name: "Braut", division: "Delhi", state: "Uttar Pradesh", latitude: 28.7500, longitude: 77.2833 },
  "AMRO": { name: "Amroha", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.9030, longitude: 78.4670 },
  "PM": { name: "Palam", division: "Delhi", state: "Delhi", latitude: 28.5800, longitude: 77.1200 },
  "DSB": { name: "Delhi Sadar Bazar", division: "Delhi", state: "Delhi", latitude: 28.6500, longitude: 77.2200 },
  "JHS": { name: "Jhansi", division: "Jhansi", state: "Uttar Pradesh", latitude: 25.4484, longitude: 78.5685 },
  "MTJ": { name: "Mathura", division: "Agra Cantt.", state: "Uttar Pradesh", latitude: 27.4924, longitude: 77.6737 },
  "AF": { name: "Agra Fort", division: "Agra Cantt.", state: "Uttar Pradesh", latitude: 27.1794, longitude: 78.0211 },
  "ALJN": { name: "Aligarh", division: "Allahabad", state: "Uttar Pradesh", latitude: 27.8974, longitude: 78.0880 },
  "COI": { name: "Chheoki", division: "Allahabad", state: "Uttar Pradesh", latitude: 25.4381, longitude: 81.8782 },
  "MZP": { name: "Mirzapur", division: "Allahabad", state: "Uttar Pradesh", latitude: 25.1445, longitude: 82.5653 },
  "ETW": { name: "Etawah", division: "Allahabad", state: "Uttar Pradesh", latitude: 26.7779, longitude: 79.0219 },
  "TDL": { name: "Tundla", division: "Allahabad", state: "Uttar Pradesh", latitude: 27.2146, longitude: 78.2360 },
  "BNDA": { name: "Banda", division: "Jhansi", state: "Uttar Pradesh", latitude: 25.4753, longitude: 80.3358 },
  "MRA": { name: "Morena", division: "Jhansi", state: "Madhya Pradesh", latitude: 26.4947, longitude: 77.9946 },
  "LAR": { name: "Lalitpur", division: "Jhansi", state: "Uttar Pradesh", latitude: 24.6900, longitude: 78.4183 },
  "CKTD": { name: "Chitrakut Dham", division: "Jhansi", state: "Uttar Pradesh", latitude: 25.2010, longitude: 80.8580 },
  "MBA": { name: "Mahoba", division: "Jhansi", state: "Uttar Pradesh", latitude: 25.2920, longitude: 79.8720 },
  "FTP": { name: "Fatehpur", division: "Allahabad", state: "Uttar Pradesh", latitude: 25.9304, longitude: 80.8122 },
  "RKM": { name: "Raja ki Mandi", division: "Agra Cantt.", state: "Uttar Pradesh", latitude: 27.1942, longitude: 78.0081 },
  "MKP": { name: "Manikpur", division: "Jhansi", state: "Uttar Pradesh", latitude: 25.0595, longitude: 81.0975 },
  "ORAI": { name: "Orai", division: "Jhansi", state: "Uttar Pradesh", latitude: 26.0028, longitude: 79.4500 },
  "KURJ": { name: "Khajuraho", division: "Jhansi", state: "Madhya Pradesh", latitude: 24.8500, longitude: 79.9333 },
  "PHD": { name: "Phaphund", division: "Allahabad", state: "Uttar Pradesh", latitude: 26.5997, longitude: 79.4636 },
  "DAA": { name: "Datia", division: "Jhansi", state: "Madhya Pradesh", latitude: 25.6720, longitude: 78.4600 },
  "DHO": { name: "Dholpur Jn.", division: "Agra Cantt.", state: "Rajasthan", latitude: 26.7025, longitude: 77.8930 },
  "DBA": { name: "Dabra", division: "Jhansi", state: "Madhya Pradesh", latitude: 25.8925, longitude: 78.3325 },
  "DER": { name: "Dadri", division: "Allahabad", state: "Uttar Pradesh", latitude: 28.5530, longitude: 77.5540 },
  "KRJ": { name: "Khurja", division: "Allahabad", state: "Uttar Pradesh", latitude: 28.2530, longitude: 77.8550 },
  "GKP": { name: "Gorakhpur Jn", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.7610, longitude: 83.3732 },
  "LJN": { name: "Lucknow Jn", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.8344, longitude: 80.9231 },
  "CPR": { name: "Chhapra Jn", division: "Varanasi", state: "Bihar", latitude: 25.7800, longitude: 84.7300 },
  "SV": { name: "Siwan", division: "Varanasi", state: "Bihar", latitude: 26.2200, longitude: 84.3600 },
  "GD": { name: "Gonda Jn", division: "Lucknow", state: "Uttar Pradesh", latitude: 27.1325, longitude: 81.9692 },
  "MUV": { name: "Manduwadih", division: "Varanasi", state: "Uttar Pradesh", latitude: 25.3092, longitude: 82.9739 },
  "BST": { name: "Basti", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.7945, longitude: 82.7329 },
  "AMH": { name: "Azamgarh", division: "Varanasi", state: "Uttar Pradesh", latitude: 26.0676, longitude: 83.1836 },
  "BUI": { name: "Ballia", division: "Varanasi", state: "Uttar Pradesh", latitude: 25.7588, longitude: 84.1486 },
  "MAU": { name: "Mau Jn", division: "Varanasi", state: "Uttar Pradesh", latitude: 25.9492, longitude: 83.5611 },
  "DEOS": { name: "Deoria Sadar", division: "Varanasi", state: "Uttar Pradesh", latitude: 26.5017, longitude: 83.7836 },
  "KGM": { name: "Kathgodam", division: "Izzatnagar", state: "Uttarakhand", latitude: 29.2742, longitude: 79.5266 },
  "KLD": { name: "Khalilabad", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.7742, longitude: 83.0711 },
  "FBD": { name: "Farrukhabad", division: "Izzatnagar", state: "Uttar Pradesh", latitude: 27.3900, longitude: 79.5800 },
  "GCT": { name: "Ghazipur City", division: "Varanasi", state: "Uttar Pradesh", latitude: 25.5800, longitude: 83.5800 },
  "RUPC": { name: "Rudrapur City", division: "Izzatnagar", state: "Uttar Pradesh", latitude: 28.9800, longitude: 79.4000 },
  "BLTR": { name: "Belthara Road", division: "Varanasi", state: "Uttar Pradesh", latitude: 26.1200, longitude: 83.9000 },
  "BNZ": { name: "Badshahnagar", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.8800, longitude: 80.9500 },
  "KSJ": { name: "Kasganj Jn", division: "Izzatnagar", state: "Uttar Pradesh", latitude: 27.8000, longitude: 78.6500 },
  "KJN": { name: "Kannauj", division: "Izzatnagar", state: "Uttar Pradesh", latitude: 27.0500, longitude: 79.9000 },
  "BCY": { name: "Varanasi", division: "Varanasi", state: "Uttar Pradesh", latitude: 25.3176, longitude: 82.9739 },
  "BTT": { name: "Bhatni", division: "Varanasi", state: "Uttar Pradesh", latitude: 26.2300, longitude: 83.8500 },
  "LKU": { name: "Lalkuan Jn", division: "Izzatnagar", state: "Uttarakhand", latitude: 29.0800, longitude: 79.4000 },
  "HDW": { name: "Haldwani", division: "Izzatnagar", state: "Uttar Pradesh", latitude: 29.2200, longitude: 79.5200 },
  "MUR": { name: "Mankapur Jn", division: "Lucknow", state: "Uttar Pradesh", latitude: 27.0500, longitude: 82.0500 },
  "KPV": { name: "Kashipur", division: "Izzatnagar", state: "Uttarakhand", latitude: 29.2200, longitude: 78.9500 },
  "PBE": { name: "Pilibhit Jn", division: "Izzatnagar", state: "Uttar Pradesh", latitude: 28.6400, longitude: 79.8100 },
  "BC": { name: "Bareilly City", division: "Izzatnagar", state: "Uttar Pradesh", latitude: 28.3500, longitude: 79.4200 },
  "GHY": { name: "Guwahati", division: "Lumding", state: "Assam", latitude: 26.1832, longitude: 91.7442 },
  "NJP": { name: "New Jalpaiguri", division: "Katihar", state: "West Bengal", latitude: 26.6843, longitude: 88.4285 },
  "KIR": { name: "Katihar", division: "Katihar", state: "Bihar", latitude: 25.5385, longitude: 87.5706 },
  "KYQ": { name: "Kamakhya", division: "Lumding", state: "Assam", latitude: 26.1662, longitude: 91.7052 },
  "DMV": { name: "Dimapur", division: "Lumding", state: "Nagaland", latitude: 25.9063, longitude: 93.7276 },
  "KNE": { name: "Kishanganj", division: "Katihar", state: "Bihar", latitude: 25.6846, longitude: 87.9422 },
  "NCB": { name: "New Coochbehar", division: "Alipur Dwar", state: "West Bengal", latitude: 26.3420, longitude: 89.4512 },
  "NTSK": { name: "New Tinsukia", division: "Tinsukia", state: "Assam", latitude: 27.4890, longitude: 95.3585 },
  "DBRT": { name: "Dibrugarh Town", division: "Tinsukia", state: "Assam", latitude: 27.4728, longitude: 94.9110 },
  "NBQ": { name: "New Bongaigaon", division: "Rangiya", state: "Assam", latitude: 26.5023, longitude: 90.5350 },
  "RNY": { name: "Rangiya Jn.", division: "Rangiya", state: "Assam", latitude: 26.4486, longitude: 91.6222 },
  "MXN": { name: "Mariyani Jn.", division: "Tinsukia", state: "Assam", latitude: 26.6620, longitude: 94.1720 },
  "NOQ": { name: "New Alipurduar", division: "Alipurduar", state: "West Bengal", latitude: 26.4980, longitude: 89.5270 },
  "BOE": { name: "Barsoi Jn.", division: "Katihar", state: "Bihar", latitude: 25.6290, longitude: 87.9250 },
  "DBRG": { name: "Dibrugarh", division: "Tinsukia", state: "Assam", latitude: 27.4728, longitude: 94.9110 },
  "SCL": { name: "Silchar", division: "Lumding", state: "Assam", latitude: 24.8270, longitude: 92.7970 },
  "JBN": { name: "Jogbani", division: "Katihar", state: "Bihar", latitude: 26.3990, longitude: 87.2620 },
  "LMG": { name: "Lumding", division: "Lumding", state: "Assam", latitude: 25.7500, longitude: 93.1700 },
  "RGJ": { name: "Raiganj", division: "Katihar", state: "West Bengal", latitude: 25.6160, longitude: 88.1240 },
  "BPRD": { name: "Barpeta Road", division: "Rangiya", state: "Assam", latitude: 26.5020, longitude: 90.9700 },
  "APDJ": { name: "Alipurduar Jn.", division: "Alipurduar", state: "West Bengal", latitude: 26.4830, longitude: 89.5220 },
  "DQG": { name: "Dhupguri", division: "Alipurduar", state: "West Bengal", latitude: 26.5890, longitude: 89.0070 },
  "KOJ": { name: "Kokrajhar", division: "Alipurduar", state: "Assam", latitude: 26.4000, longitude: 90.2700 },
  "SGUJ": { name: "Siliguri Jn.", division: "Katihar", state: "West Bengal", latitude: 26.7270, longitude: 88.3950 },
  "PRNA": { name: "Purnea", division: "Katihar", state: "Bihar", latitude: 25.7780, longitude: 87.4750 },
  "ARQ": { name: "Araria Court", division: "Katihar", state: "Bihar", latitude: 26.1500, longitude: 87.4500 },
  "BKN": { name: "Bikaner", division: "Bikaner", state: "Rajasthan", latitude: 28.0220, longitude: 73.3110 },
  "ABR": { name: "Abu Road", division: "Ajmer", state: "Rajasthan", latitude: 24.4800, longitude: 72.7800 },
  "RE": { name: "Rewari", division: "Jaipur", state: "Haryana", latitude: 28.2000, longitude: 76.6200 },
  "AWR": { name: "Alwar", division: "Jaipur", state: "Rajasthan", latitude: 27.5600, longitude: 76.6000 },
  "FA": { name: "Falna", division: "Ajmer", state: "Rajasthan", latitude: 25.2300, longitude: 73.2500 },
  "SGNR": { name: "Sri Ganga Nagar", division: "Bikaner", state: "Rajasthan", latitude: 29.9200, longitude: 73.8800 },
  "HSR": { name: "Hisar", division: "Bikaner", state: "Haryana", latitude: 29.1700, longitude: 75.7200 },
  "JSM": { name: "Jaisalmer", division: "Jodhpur", state: "Rajasthan", latitude: 26.9157, longitude: 70.9083 },
  "BHL": { name: "Bhilwara", division: "Ajmer", state: "Rajasthan", latitude: 25.3471, longitude: 74.6408 },
  "BKI": { name: "Bandikui", division: "Jaipur", state: "Rajasthan", latitude: 27.0500, longitude: 76.5700 },
  "SOG": { name: "Suratgarh", division: "Bikaner", state: "Rajasthan", latitude: 29.3200, longitude: 73.9000 },
  "NGO": { name: "Nagaur", division: "Jodhpur", state: "Rajasthan", latitude: 27.2000, longitude: 73.7300 },
  "MJ": { name: "Marwar Jn.", division: "Ajmer", state: "Rajasthan", latitude: 25.6500, longitude: 73.4500 },
  "PMY": { name: "Pali Marwar", division: "Jodhpur", state: "Rajasthan", latitude: 25.7700, longitude: 73.3200 },
  "BME": { name: "Barmer", division: "Jodhpur", state: "Rajasthan", latitude: 25.7500, longitude: 71.3800 },
  "BGKT": { name: "Bhagat Ki Kothi", division: "Jodhpur", state: "Rajasthan", latitude: 26.2700, longitude: 73.0200 },
  "LGH": { name: "Lalgarh", division: "Bikaner", state: "Rajasthan", latitude: 28.0300, longitude: 73.3300 },
  "HMH": { name: "Hanumangarh Jn.", division: "Bikaner", state: "Rajasthan", latitude: 29.5800, longitude: 74.3200 },
  "BNW": { name: "Bhiwani", division: "Bikaner", state: "Haryana", latitude: 28.8000, longitude: 76.1300 },
  "MTD": { name: "Merta Road", division: "Jodhpur", state: "Rajasthan", latitude: 26.6500, longitude: 74.0300 },
  "DO": { name: "Dausa", division: "Jaipur", state: "Rajasthan", latitude: 26.8900, longitude: 76.3300 },
  "KSG": { name: "Kishangarh", division: "Jaipur", state: "Rajasthan", latitude: 26.5800, longitude: 74.8600 },
  "FL": { name: "Phulera", division: "Jaipur", state: "Rajasthan", latitude: 26.8700, longitude: 75.2400 },
  "DPA": { name: "Durgapura", division: "Jaipur", state: "Rajasthan", latitude: 26.8400, longitude: 75.7900 },
  "BER": { name: "Beawar", division: "Ajmer", state: "Rajasthan", latitude: 25.7400, longitude: 73.8800 },
  "SSA": { name: "Sirsa", division: "Bikaner", state: "Haryana", latitude: 29.5300, longitude: 75.0300 },
  "MAS": { name: "Chennai Central", division: "Chennai", state: "TamilNadu", latitude: 13.0827, longitude: 80.2750 },
  "MS": { name: "Chennai Egmore", division: "Chennai", state: "TamilNadu", latitude: 13.0732, longitude: 80.2606 },
  "TBM": { name: "Tambaram", division: "Chennai", state: "TamilNadu", latitude: 12.9228, longitude: 80.1275 },
  "CBE": { name: "Coimbatore Jn.", division: "Salem", state: "TamilNadu", latitude: 11.0012, longitude: 76.9661 },
  "TVC": { name: "Tiruvananthapuram Central", division: "Tiruchchirappalli", state: "TamilNadu", latitude: 8.4875, longitude: 76.9526 },
  "MDU": { name: "Madurai Jn.", division: "Madurai", state: "TamilNadu", latitude: 9.9252, longitude: 78.1198 },
  "CLT": { name: "Kozhikode", division: "Palghat", state: "Kerala", latitude: 11.2588, longitude: 75.7804 },
  "KPD": { name: "Katpadi", division: "Chennai", state: "TamilNadu", latitude: 12.9698, longitude: 79.1412 },
  "TCR": { name: "Thrissur", division: "Trivandrum", state: "Kerala", latitude: 10.5276, longitude: 76.2144 },
  "CGL": { name: "Chengalpattu Jn.", division: "Chennai", state: "TamilNadu", latitude: 12.7000, longitude: 79.9800 },
  "AJJ": { name: "Arakkonam Jn.", division: "Chennai", state: "TamilNadu", latitude: 13.0800, longitude: 79.6700 },
  "TRL": { name: "Tiruvallur", division: "Chennai", state: "TamilNadu", latitude: 13.1200, longitude: 79.9100 },
  "TPJ": { name: "Tiruchchirappalli Jn", division: "Tiruchchirappalli", state: "Tamilnadu", latitude: 10.8050, longitude: 78.6856 },
  "TEN": { name: "Tirunelveli Jn", division: "Madurai", state: "Tamilnadu", latitude: 8.7139, longitude: 77.7567 },
  "MAQ": { name: "Mangalore Central", division: "Palghat", state: "Karnataka", latitude: 12.8676, longitude: 74.8354 },
  "ED": { name: "Erode Jn", division: "Salem", state: "Tamilnadu", latitude: 11.3410, longitude: 77.7274 },
  "SA": { name: "Salem Jn", division: "Salem", state: "Tamilnadu", latitude: 11.6643, longitude: 78.1460 },
  "CAN": { name: "Kannur", division: "Palghat", state: "Kerala", latitude: 11.8745, longitude: 75.3704 },
  "ERN": { name: "Eraniel", division: "Trivandrum", state: "Tamilnadu", latitude: 8.2149, longitude: 77.3216 },
  "TUP": { name: "Tiruppur", division: "Salem", state: "Tamilnadu", latitude: 11.1085, longitude: 77.3411 },
  "AWY": { name: "Aluva", division: "Trivandrum", state: "Kerala", latitude: 10.1065, longitude: 76.3565 },
  "PGT": { name: "Palakkad Jn", division: "Palghat", state: "Kerala", latitude: 10.7828, longitude: 76.6548 },
  "QLN": { name: "Kollam Jn", division: "Trivandrum", state: "Kerala", latitude: 8.8852, longitude: 76.5953 },
  "KTYM": { name: "Kottayam", division: "Trivandrum", state: "Kerala", latitude: 9.5916, longitude: 76.5270 },
  "SRR": { name: "Shoranur Jn", division: "Palghat", state: "Kerala", latitude: 10.7670, longitude: 76.2711 },
  "CNGR": { name: "Chengannur", division: "Trivandrum", state: "Kerala", latitude: 9.3150, longitude: 76.6109 },
  "NCJ": { name: "Nagercoil Jn", division: "Trivandrum", state: "Tamilnadu", latitude: 8.1915, longitude: 77.4328 },
  "KYJ": { name: "Kayankulam Jn", division: "Trivandrum", state: "Kerala", latitude: 9.1722, longitude: 76.4988 },
  "TLY": { name: "Thalassery", division: "Palghat", state: "Kerala", latitude: 11.7505, longitude: 75.4897 },
  "TJ": { name: "Thanjavur Jn", division: "Tiruchchirappalli", state: "Tamilnadu", latitude: 10.7870, longitude: 79.1378 },
  "MAJN": { name: "Mangalore Jn", division: "Palghat", state: "Karnataka", latitude: 12.9172, longitude: 74.8397 },
  "DG": { name: "Dindigul Jn", division: "Madurai", state: "Tamilnadu", latitude: 10.3603, longitude: 77.9700 },
  "RMM": { name: "Rameswaram", division: "Madurai", state: "Tamilnadu", latitude: 9.2820, longitude: 79.3015 },
  "TN": { name: "Tuticorin", division: "Madurai", state: "Tamilnadu", latitude: 8.7832, longitude: 78.1374 },
  "JTJ": { name: "Jolarpettai", division: "Chennai", state: "Tamilnadu", latitude: 12.5700, longitude: 78.5731 },
  "TIR": { name: "Tirur", division: "Palghat", state: "Kerala", latitude: 10.9149, longitude: 75.9240 },
  "VM": { name: "Villupuram Jn", division: "Tiruchchirappalli", state: "Tamilnadu", latitude: 11.9383, longitude: 79.4845 },
  "KCVL": { name: "Kochuveli", division: "Trivandrum", state: "Kerala", latitude: 8.4989, longitude: 76.8952 },
  "ALLP": { name: "Alappuzha", division: "Trivandrum", state: "Kerala", latitude: 9.4981, longitude: 76.3388 },
  "PER": { name: "Perambur", division: "Chennai", state: "Tamilnadu", latitude: 13.1072, longitude: 80.2574 },
  "MBM": { name: "Mambalam", division: "Chennai", state: "Tamilnadu", latitude: 13.0290, longitude: 80.2214 },
  "GI": { name: "Guduvancheri", division: "Chennai", state: "Tamilnadu", latitude: 12.8452, longitude: 80.0635 },
  "PRGL": { name: "Perungalathur", division: "Chennai", state: "Tamilnadu", latitude: 12.9245, longitude: 80.0917 },
  "CAPE": { name: "Kanniyakumari", division: "Trivandrum", state: "Tamilnadu", latitude: 8.0883, longitude: 77.5492 },
  "BDJ": { name: "Vadakara", division: "Palghat", state: "Kerala", latitude: 11.6080, longitude: 75.5913 },
  "KGQ": { name: "Kasargod", division: "Palghat", state: "Kerala", latitude: 12.5000, longitude: 74.9900 },
  "TRVL": { name: "Tiruvalla", division: "Trivandrum", state: "Kerala", latitude: 9.3813, longitude: 76.5740 },
  "KMU": { name: "Kumbakonam", division: "Tiruchchirappalli", state: "Tamilnadu", latitude: 10.9600, longitude: 79.3800 },
  "PAY": { name: "Payyannur", division: "Palghat", state: "Kerala", latitude: 12.0930, longitude: 75.2020 },
  "CVP": { name: "Kovilpatti", division: "Madurai", state: "Tamilnadu", latitude: 9.1710, longitude: 77.8680 },
  "VPT": { name: "Virudhunagar Jn", division: "Madurai", state: "Tamilnadu", latitude: 9.5850, longitude: 77.9570 },
  "MV": { name: "Mayiladuthurai Jn", division: "Tiruchchirappalli", state: "Tamilnadu", latitude: 11.1030, longitude: 79.6550 },
  "NGT": { name: "Nagappattinam", division: "Tiruchchirappalli", state: "Tamilnadu", latitude: 10.7650, longitude: 79.8420 },
  "KZE": { name: "Kanhangad", division: "Palghat", state: "Kerala", latitude: 12.3320, longitude: 75.0850 },
  "KRR": { name: "Karur Jn", division: "Salem", state: "Tamilnadu", latitude: 10.9570, longitude: 78.0780 },
  "RMD": { name: "Ramanathapuram", division: "Madurai", state: "Tamilnadu", latitude: 9.3710, longitude: 79.3120 },
  "KTU": { name: "Kuttipuram", division: "Palghat", state: "Kerala", latitude: 10.8330, longitude: 76.0670 },
  "MTP": { name: "Mettupalaiyam", division: "Salem", state: "Tamilnadu", latitude: 11.4320, longitude: 76.9330 },
  "CGY": { name: "Changanacheri", division: "Trivandrum", state: "Kerala", latitude: 9.4410, longitude: 76.5400 },
  "VAK": { name: "Varkalashivagiri", division: "Trivandrum", state: "Kerala", latitude: 8.7380, longitude: 76.7250 },
  "TRT": { name: "Tiruttani", division: "Chennai", state: "Tamilnadu", latitude: 13.1800, longitude: 79.6200 },
  "SKL": { name: "Singaperumalkoil", division: "Chennai", state: "Tamilnadu", latitude: 12.7460, longitude: 80.0020 },
  "AFK": { name: "Angamali for Kaladi", division: "Trivandrum", state: "Kerala", latitude: 10.1830, longitude: 76.3850 },
  "HYB": { name: "Hyderabad", division: "Secunderabad", state: "Andhra Pradesh", latitude: 17.3850, longitude: 78.4867 },
  "KCG": { name: "Kacheguda", division: "Hyderabad", state: "Telangana", latitude: 17.3850, longitude: 78.4867 },
  "NED": { name: "Huzur Saheb Nanded", division: "Nanded", state: "Maharashtra", latitude: 19.1600, longitude: 77.3200 },
  "RJY": { name: "Rajahmundry", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.9890, longitude: 81.7840 },
  "AWB": { name: "Aurangabad", division: "Nanded", state: "Maharashtra", latitude: 19.8800, longitude: 75.3200 },
  "RU": { name: "Renigunta", division: "Guntakal", state: "Andhra Pradesh", latitude: 13.6500, longitude: 79.4200 },
  "GNT": { name: "Guntur", division: "Guntur", state: "Andhra Pradesh", latitude: 16.3060, longitude: 80.4360 },
  "WL": { name: "Warangal", division: "Secunderabad", state: "Andhra Pradesh", latitude: 17.9780, longitude: 79.5910 },
  "SLO": { name: "Samalkot", division: "Vijayawada", state: "Andhra Pradesh", latitude: 17.0530, longitude: 82.1690 },
  "KZJ": { name: "Kazipet Jn", division: "Secunderabad", state: "Andhra Pradesh", latitude: 17.9700, longitude: 79.5300 },
  "OGL": { name: "Ongole", division: "Vijayawada", state: "Andhra Pradesh", latitude: 15.5000, longitude: 80.0500 },
  "KMT": { name: "Khammam", division: "Secunderabad", state: "Andhra Pradesh", latitude: 17.2500, longitude: 80.1500 },
  "GTL": { name: "Guntakal", division: "Guntakal", state: "Andhra Pradesh", latitude: 15.1700, longitude: 77.3800 },
  "GDR": { name: "Gudur", division: "Vijayawada", state: "Andhra Pradesh", latitude: 14.1500, longitude: 79.8500 },
  "CCT": { name: "Kakinada Tn", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.9330, longitude: 82.2160 },
  "RC": { name: "Raichur", division: "Guntakal", state: "Karnataka", latitude: 16.2000, longitude: 77.3667 },
  "PBN": { name: "Parbhani", division: "Nanded", state: "Maharashtra", latitude: 19.2700, longitude: 76.7700 },
  "NSL": { name: "Nagarsol", division: "Nanded", state: "Maharashtra", latitude: 20.2500, longitude: 74.4400 },
  "TEL": { name: "Tenali", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.2400, longitude: 80.6400 },
  "ATP": { name: "Anantapur", division: "Guntakal", state: "Andhra Pradesh", latitude: 14.6800, longitude: 77.6000 },
  "NZB": { name: "Nizamabad", division: "Hyderabad", state: "Andhra Pradesh", latitude: 18.6700, longitude: 78.1000 },
  "YG": { name: "Yadgir", division: "Guntakal", state: "Karnataka", latitude: 16.7700, longitude: 77.1400 },
  "EE": { name: "Eluru", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.7100, longitude: 81.1000 },
  "BVRT": { name: "Bhimavaram Tn", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.5400, longitude: 81.5200 },
  "HX": { name: "Cuddapah", division: "Guntakal", state: "Andhra Pradesh", latitude: 14.4700, longitude: 78.8200 },
  "LPI": { name: "Lingampalli", division: "Secunderabad", state: "Telangana", latitude: 17.5000, longitude: 78.3200 },
  "KRNT": { name: "Kurnool Tn", division: "Hyderabad", state: "Andhra Pradesh", latitude: 15.8300, longitude: 78.0500 },
  "AKP": { name: "Anakapalli", division: "Vijayawada", state: "Andhra Pradesh", latitude: 17.6800, longitude: 83.0000 },
  "J": { name: "Jalna", division: "Nanded", state: "Maharashtra", latitude: 19.8400, longitude: 75.8800 },
  "TDD": { name: "Tadepalligudem", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.8100, longitude: 81.5200 },
  "CLX": { name: "Chirala", division: "Vijayawada", state: "Andhra Pradesh", latitude: 15.8200, longitude: 80.3500 },
  "TUNI": { name: "Tuni", division: "Vijayawada", state: "Andhra Pradesh", latitude: 17.3500, longitude: 82.5500 },
  "MCI": { name: "Manchiryal", division: "Secunderabad", state: "Andhra Pradesh", latitude: 18.8500, longitude: 79.4500 },
  "BIDR": { name: "Bidar", division: "Secunderabad", state: "Karnataka", latitude: 17.9100, longitude: 77.5300 },
  "AD": { name: "Adoni", division: "Guntakal", state: "Andhra Pradesh", latitude: 15.6300, longitude: 77.2800 },
  "COA": { name: "Kakinada Port", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.9300, longitude: 82.2200 },
  "RDM": { name: "Ramagundam", division: "Secunderabad", state: "Andhra Pradesh", latitude: 18.7500, longitude: 79.4500 },
  "DMM": { name: "Dharmavaram", division: "Guntakal", state: "Andhra Pradesh", latitude: 14.4200, longitude: 77.7200 },
  "NS": { name: "Narasapur", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.4300, longitude: 81.6700 },
  "BDCR": { name: "Bhadrachalam Rd", division: "Secunderabad", state: "Andhra Pradesh", latitude: 17.6700, longitude: 80.8900 },
  "MALM": { name: "Mantralayam Rd", division: "Guntakal", state: "Andhra Pradesh", latitude: 15.7700, longitude: 77.2700 },
  "GDV": { name: "Gudivada", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.4400, longitude: 81.0000 },
  "MABD": { name: "Mahbubabad", division: "Secunderabad", state: "Andhra Pradesh", latitude: 17.6000, longitude: 80.0000 },
  "BMT": { name: "Begumpet", division: "Secunderabad", state: "Andhra Pradesh", latitude: 17.4400, longitude: 78.4600 },
  "NDL": { name: "Nandyal", division: "Guntur", state: "Andhra Pradesh", latitude: 15.4800, longitude: 78.4800 },
  "TDU": { name: "Tandur", division: "Secundarabad", state: "Telangana", latitude: 17.2485, longitude: 77.5770 },
  "CTO": { name: "Chittoor", division: "Guntakal", state: "Andhra Pradesh", latitude: 13.2171, longitude: 79.1007 },
  "VKB": { name: "Vikarabad", division: "Secundarabad", state: "Telangana", latitude: 17.3364, longitude: 77.9048 },
  "RAL": { name: "Repalle", division: "Guntur", state: "Andhra Pradesh", latitude: 16.0184, longitude: 80.8296 },
  "TATA": { name: "Tatanagar", division: "Chakradharpur", state: "Jharkhand", latitude: 22.8046, longitude: 86.2029 },
  "KGP": { name: "Kharagpur", division: "Kharagpur", state: "West Bengal", latitude: 22.3460, longitude: 87.2320 },
  "ROU": { name: "Rourkela", division: "Chakradharpur", state: "Odisha", latitude: 22.2250, longitude: 84.8641 },
  "HTE": { name: "Hatia", division: "Ranchi", state: "Jharkhand", latitude: 23.3109, longitude: 85.3072 },
  "SHM": { name: "Shalimar", division: "Kharagpur", state: "West Bengal", latitude: 22.5588, longitude: 88.3033 },
  "JSG": { name: "Jharsuguda", division: "Chakradharpur", state: "Odisha", latitude: 21.8500, longitude: 84.0300 },
  "BKSC": { name: "Bokaro Steel City", division: "Adra", state: "Jharkhand", latitude: 23.6693, longitude: 86.1511 },
  "BLS": { name: "Balasore", division: "Kharagpur", state: "Odisha", latitude: 21.4950, longitude: 86.9427 },
  "CKP": { name: "Chakradharpur", division: "Chakradharpur", state: "Jharkhand", latitude: 22.7000, longitude: 85.6300 },
  "PRR": { name: "Purulia Jn.", division: "Adra", state: "West Bengal", latitude: 23.4956, longitude: 86.6743 },
  "DGHA": { name: "Digha", division: "Kharagpur", state: "West Bengal", latitude: 21.6266, longitude: 87.5074 },
  "BQA": { name: "Bankura Jn.", division: "Adra", state: "West Bengal", latitude: 23.2338, longitude: 87.0873 },
  "MDN": { name: "Midnapur", division: "Kharagpur", state: "West Bengal", latitude: 22.3304, longitude: 87.3181 },
  "ADRA": { name: "Adra", division: "Adra", state: "West Bengal", latitude: 23.4956, longitude: 86.6743 },
  "JGM": { name: "Jhargram", division: "Kharagpur", state: "West Bengal", latitude: 22.4538, longitude: 86.9950 },
  "R": { name: "Raipur", division: "Raipur", state: "Chhattisgarh", latitude: 21.2376, longitude: 81.5962 },
  "BSP": { name: "Bilaspur", division: "Bilaspur", state: "Chhattisgarh", latitude: 22.0786, longitude: 82.1523 },
  "DURG": { name: "Durg", division: "Raipur", state: "Chhattisgarh", latitude: 21.1904, longitude: 81.2849 },
  "G": { name: "Gondia", division: "Nagpur (SECR)", state: "Maharashtra", latitude: 21.4598, longitude: 80.1950 },
  "RIG": { name: "Raigarh", division: "Bilaspur", state: "Chhattisgarh", latitude: 21.8974, longitude: 83.3966 },
  "CPH": { name: "CPH", division: "Bilaspur", state: "Chhattisgarh", latitude: 22.0786, longitude: 82.1523 },
  "APR": { name: "Anuppur", division: "Bilaspur", state: "Madhya Pradesh", latitude: 23.1034, longitude: 81.6908 },
  "RJN": { name: "Rajnandgaon", division: "Nagpur (SECR)", state: "Chhattisgarh", latitude: 21.0979, longitude: 81.0337 },
  "SDL": { name: "Shahdol", division: "Bilaspur", state: "Madhya Pradesh", latitude: 23.3022, longitude: 81.3568 },
  "BYT": { name: "Bhatapara", division: "Raipur", state: "Chhattisgarh", latitude: 21.7384, longitude: 81.9480 },
  "KRBA": { name: "Korba", division: "Bilaspur", state: "Chhattisgarh", latitude: 22.3500, longitude: 82.6800 },
  "BPHB": { name: "Bhilai Power House", division: "Raipur", state: "Chhattisgarh", latitude: 21.2092, longitude: 81.4285 },
  "ABKP": { name: "Ambikapur", division: "Bilaspur", state: "Chhattisgarh", latitude: 23.1164, longitude: 83.1961 },
  "ITR": { name: "Itwari", division: "Nagpur (SECR)", state: "Maharashtra", latitude: 21.1500, longitude: 79.1333 },
  "DGG": { name: "Dongargadh", division: "Nagpur (SECR)", state: "Chhattisgarh", latitude: 21.1885, longitude: 80.7560 },
  "MYS": { name: "Mysore", division: "Mysore", state: "Karnataka", latitude: 12.2979, longitude: 76.6393 },
  "UBL": { name: "Hubli Junction", division: "Hubli", state: "Karnataka", latitude: 15.3478, longitude: 75.1338 },
  "KJM": { name: "Krishnarajapuram", division: "Bangalore", state: "Karnataka", latitude: 12.9950, longitude: 77.6800 },
  "VSG": { name: "Vasco-da-gama", division: "Hubli", state: "Goa", latitude: 15.3860, longitude: 73.8440 },
  "BAY": { name: "Bellary Jn.", division: "Hubli", state: "Karnataka", latitude: 15.1421, longitude: 76.9240 },
  "DVG": { name: "Davangere", division: "Mysore", state: "Karnataka", latitude: 14.4666, longitude: 75.9242 },
  "BWT": { name: "Bangarapet", division: "Bangalore", state: "Karnataka", latitude: 12.9915, longitude: 78.1788 },
  "MYA": { name: "Mandya", division: "Bangalore", state: "Karnataka", latitude: 12.5223, longitude: 76.8975 },
  "HPT": { name: "Hospet Jn.", division: "Hubli", state: "Karnataka", latitude: 15.2689, longitude: 76.3909 },
  "KGI": { name: "Kengeri", division: "Bangalore", state: "Karnataka", latitude: 12.8996, longitude: 77.4827 },
  "BJP": { name: "Bijapur", division: "Hubli", state: "Karnataka", latitude: 16.8300, longitude: 75.7100 },
  "SSPN": { name: "Srisatyasaiprashanthinilayam", division: "Bangalore", state: "Andhra Pradesh", latitude: 14.1610, longitude: 77.7589 },
  "SMET": { name: "Shimoga Tn.", division: "Mysore", state: "Karnataka", latitude: 13.9316, longitude: 75.5679 },
  "GDG": { name: "Gadag Jn.", division: "Hubli", state: "Karnataka", latitude: 15.4233, longitude: 75.6037 },
  "ASK": { name: "Arsikere", division: "Mysore", state: "Karnataka", latitude: 13.3145, longitude: 76.2570 },
  "YNK": { name: "Yelahanka", division: "Bangalore", state: "Karnataka", latitude: 13.1007, longitude: 77.5963 },
  "HSRA": { name: "Hosur", division: "Bangalore", state: "TamilNadu", latitude: 12.7365, longitude: 77.8326 },
  "TK": { name: "Tumkur", division: "Bangalore", state: "Karnataka", latitude: 13.3414, longitude: 77.1022 },
  "MLO": { name: "Malur", division: "Bangalore", state: "Karnataka", latitude: 13.0210, longitude: 77.9380 },
  "CPT": { name: "Channapatna", division: "Bangalore", state: "Karnataka", latitude: 12.6518, longitude: 77.2089 },
  "RMGM": { name: "Ramanagaram", division: "Bangalore", state: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
  "WFD": { name: "Whitefield", division: "Bangalore", state: "Karnataka", latitude: 12.9714, longitude: 77.7501 },
  "NTW": { name: "Nanjangud Tn", division: "Mysore", state: "Karnataka", latitude: 12.1176, longitude: 76.6840 },
  "KPN": { name: "Kuppam", division: "Bangalore", state: "Andhra Pradesh", latitude: 12.7482, longitude: 78.3461 },
  "BRC": { name: "Vadodara Jn.", division: "Vadodara", state: "Gujarat", latitude: 22.2994, longitude: 73.2081 },
  "UJN": { name: "Ujjain", division: "Ratlam", state: "Madhya Pradesh", latitude: 23.3304, longitude: 75.0443 },
  "NVS": { name: "Navsari", division: "Mumbai", state: "Gujarat", latitude: 20.9500, longitude: 72.9300 },
  "RJT": { name: "Rajkot", division: "Rajkot", state: "Gujarat", latitude: 22.2916, longitude: 70.7932 },
  "VAPI": { name: "Vapi", division: "Mumbai", state: "Gujarat", latitude: 20.3718, longitude: 72.9049 },
  "RTM": { name: "Ratlam", division: "Ratlam", state: "Madhya Pradesh", latitude: 23.3342, longitude: 75.0376 },
  "JAM": { name: "Jamnagar", division: "Rajkot", state: "Gujarat", latitude: 22.4729, longitude: 70.0667 },
  "BH": { name: "Bharuch Jn.", division: "Vadodara", state: "Gujarat", latitude: 21.6948, longitude: 72.9805 },
  "GIMB": { name: "Gandhidham", division: "Ahmedabad", state: "Gujarat", latitude: 23.0791, longitude: 70.1402 },
  "BHUJ": { name: "Bhuj", division: "Ahmedabad", state: "Gujarat", latitude: 23.2420, longitude: 69.6669 },
  "ANND": { name: "Anand", division: "Vadodara", state: "Gujarat", latitude: 22.5525, longitude: 72.9552 },
  "COR": { name: "Chittorgarh", division: "Ratlam", state: "Rajasthan", latitude: 24.8799, longitude: 74.6299 },
  "AKV": { name: "Ankleshwar", division: "Vadodara", state: "Gujarat", latitude: 21.6324, longitude: 72.9900 },
  "ND": { name: "Nadiad", division: "Vadodara", state: "Gujarat", latitude: 22.7000, longitude: 72.8700 },
  "BIM": { name: "Bilimora", division: "Mumbai", state: "Gujarat", latitude: 20.7690, longitude: 72.9778 },
  "VRL": { name: "Veraval", division: "Bhavnagar", state: "Gujarat", latitude: 20.9115, longitude: 70.3709 },
  "BVC": { name: "Bhavnagar", division: "Bhavnagar", state: "Gujarat", latitude: 21.7745, longitude: 72.1525 },
  "DWK": { name: "Dwarka", division: "Rajkot", state: "Gujarat", latitude: 22.2394, longitude: 68.9678 },
  "DHD": { name: "Dahod", division: "Ratlam", state: "Gujarat", latitude: 22.8356, longitude: 74.2560 },
  "NAD": { name: "Nagda", division: "Ratlam", state: "Madhya Pradesh", latitude: 23.4583, longitude: 75.4176 },
  "SUNR": { name: "Surendranagar", division: "Rajkot", state: "Gujarat", latitude: 22.7271, longitude: 71.6486 },
  "DWX": { name: "Dewas", division: "Ratlam", state: "Madhya Pradesh", latitude: 22.9659, longitude: 76.0553 },
  "JND": { name: "Junagarh", division: "Bhavnagar", state: "Gujarat", latitude: 21.7745, longitude: 72.1525 },
  "WKR": { name: "Wankaner", division: "Rajkot", state: "Gujarat", latitude: 22.6200, longitude: 70.9300 },
  "VG": { name: "Viramgam", division: "Ahmedabad", state: "Gujarat", latitude: 23.1200, longitude: 72.0300 },
  "SIOB": { name: "Samakhiali", division: "Ahmedabad", state: "Gujarat", latitude: 23.3333, longitude: 70.5833 },
  "NMH": { name: "Nimach", division: "Ratlam", state: "Madhya Pradesh", latitude: 24.4764, longitude: 74.8700 },
  "KSB": { name: "Kosamba", division: "Vadodara", state: "Gujarat", latitude: 21.4620, longitude: 72.9584 },
  "MHD": { name: "Mahemadabad & Kheda Road", division: "Vadodara", state: "Gujarat", latitude: 22.8194, longitude: 72.7521 },
  "BTD": { name: "Botad", division: "Bhavnagar", state: "Gujarat", latitude: 22.1829, longitude: 71.6657 },
  "MYG": { name: "Miyagam Karjan Jn.", division: "Vadodara", state: "Gujarat", latitude: 22.0493, longitude: 73.1199 },
  "UBR": { name: "Umbergaon", division: "Mumbai", state: "Gujarat", latitude: 20.2000, longitude: 72.7500 },
  "KIM": { name: "Kim", division: "Vadodara", state: "Gujarat", latitude: 21.4037, longitude: 72.9238 },
  "VR": { name: "Virar", division: "Mumbai", state: "Maharashtra", latitude: 19.4559, longitude: 72.8114 },
  "BYR": { name: "Bhayandar", division: "Mumbai", state: "Maharashtra", latitude: 19.3016, longitude: 72.8511 },
  "CCG": { name: "Churchgate", division: "Mumbai", state: "Maharashtra", latitude: 18.9322, longitude: 72.8264 },
  "BSR": { name: "Vasai Road", division: "Mumbai", state: "Maharashtra", latitude: 19.3666, longitude: 72.8161 },
  "NSP": { name: "Nallasopara", division: "Mumbai", state: "Maharashtra", latitude: 19.4323, longitude: 72.7743 },
  "MDD": { name: "Malad", division: "Mumbai", state: "Maharashtra", latitude: 19.1868, longitude: 72.8489 },
  "GMN": { name: "Goregaon", division: "Mumbai", state: "Maharashtra", latitude: 19.1550, longitude: 72.8500 },
  "VTN": { name: "Vaitarana", division: "Mumbai", state: "Maharashtra", latitude: 19.2412, longitude: 73.1291 },
  "KILE": { name: "Kandivali", division: "Mumbai", state: "Maharashtra", latitude: 19.2029, longitude: 72.8494 },
  "VLP": { name: "Vile Parle", division: "Mumbai", state: "Maharashtra", latitude: 19.1025, longitude: 72.8454 },
  "BOR": { name: "Boisar", division: "Mumbai", state: "Maharashtra", latitude: 19.7969, longitude: 72.7452 },
  "MIRA": { name: "Mira Road", division: "Mumbai", state: "Maharashtra", latitude: 19.2835, longitude: 72.8573 },
  "STC": { name: "Santacruz", division: "Mumbai", state: "Maharashtra", latitude: 19.0817, longitude: 72.8414 },
  "JOS": { name: "Jogeshwari", division: "Mumbai", state: "Maharashtra", latitude: 19.1405, longitude: 72.8422 },
  "PLG": { name: "Palghar", division: "Mumbai", state: "Maharashtra", latitude: 19.6971, longitude: 72.7637 },
  "DIC": { name: "Dahisar", division: "Mumbai", state: "Maharashtra", latitude: 19.2501, longitude: 72.8593 },
  "MM": { name: "Mahim", division: "Mumbai", state: "Maharashtra", latitude: 19.0384, longitude: 72.8420 },
  "KHAR": { name: "Khar Road", division: "Mumbai", state: "Maharashtra", latitude: 19.0682, longitude: 72.8400 },
  "GTR": { name: "Grant Road", division: "Mumbai", state: "Maharashtra", latitude: 18.9564, longitude: 72.8154 },
  "DRD": { name: "Dahanu Road", division: "Mumbai", state: "Maharashtra", latitude: 19.9578, longitude: 72.7457 },
  "EPR": { name: "Elphinstone Road", division: "Mumbai", state: "Maharashtra", latitude: 19.0085, longitude: 72.8326 },
  "CYR": { name: "Charni Road", division: "Mumbai", state: "Maharashtra", latitude: 18.9630, longitude: 72.8230 },
  "JBP": { name: "Jabalpur", division: "Jabalpur", state: "Madhya Pradesh", latitude: 23.1670, longitude: 79.9501 },
  "STA": { name: "Satna", division: "Jabalpur", state: "Madhya Pradesh", latitude: 24.9867, longitude: 80.7751 },
  "KTE": { name: "Katni", division: "Jabalpur", state: "Madhya Pradesh", latitude: 23.8552, longitude: 80.3947 },
  "REWA": { name: "Rewa", division: "Jabalpur", state: "Madhya Pradesh", latitude: 24.5728, longitude: 81.2508 },
  "SWM": { name: "Sawaimadhopur", division: "Kota", state: "Rajasthan", latitude: 25.9833, longitude: 76.3667 },
  "SGO": { name: "Saugor", division: "Jabalpur", state: "Madhya Pradesh", latitude: 23.8388, longitude: 78.7387 },
  "BINA": { name: "Bina", division: "Bhopal", state: "Madhya Pradesh", latitude: 24.2122, longitude: 78.1828 },
  "BTE": { name: "Bharatpur", division: "Kota", state: "Rajasthan", latitude: 27.2169, longitude: 77.4895 },
  "MYR": { name: "Maihar", division: "Jabalpur", state: "Madhya Pradesh", latitude: 24.2694, longitude: 80.7567 },
  "DMO": { name: "Damoh", division: "Jabalpur", state: "Madhya Pradesh", latitude: 23.8366, longitude: 79.4322 },
  "GUNA": { name: "Guna", division: "Bhopal", state: "Madhya Pradesh", latitude: 24.6469, longitude: 77.3113 },
  "PPI": { name: "Pipariya", division: "Jabalpur", state: "Madhya Pradesh", latitude: 22.7629, longitude: 78.3525 },
  "GGC": { name: "Gangapur City", division: "Kota", state: "Rajasthan", latitude: 26.4725, longitude: 76.7174 },
  "BHS": { name: "Vidisha", division: "Bhopal", state: "Madhya Pradesh", latitude: 23.5300, longitude: 77.8200 },
  "HBD": { name: "Hoshangabad", division: "Bhopal", state: "Madhya Pradesh", latitude: 22.7519, longitude: 77.7303 },
  "NU": { name: "Narshinghpur", division: "Jabalpur", state: "Madhya Pradesh", latitude: 23.0117, longitude: 79.1504 },
  "HAN": { name: "Hindaun City", division: "Kota", state: "Rajasthan", latitude: 26.7311, longitude: 77.0338 },
  "BAQ": { name: "Ganjbasoda", division: "Bhopal", state: "Madhya Pradesh", latitude: 23.8519, longitude: 77.9271 },
  "DKNT": { name: "Dakaniya Talav", division: "Kota", state: "Rajasthan", latitude: 25.1443, longitude: 75.8657 },
  "PGMD": { name: "Pragati Maidan", division: "Delhi", state: "Delhi", latitude: 28.6168, longitude: 77.2434 },
  "DBSI": { name: "Daya Basti", division: "Delhi", state: "Delhi", latitude: 28.6500, longitude: 77.2000 },
  "KRTN": { name: "Kirti Nagar", division: "Delhi", state: "Delhi", latitude: 28.6551, longitude: 77.1515 },
  "NRVR": { name: "Naraina Vihar", division: "Delhi", state: "Delhi", latitude: 28.6321, longitude: 77.1389 },
  "DLPI": { name: "Delhi Inderpuri", division: "Delhi", state: "Delhi", latitude: 28.6300, longitude: 77.1451 },
  "BRSQ": { name: "Brar Square", division: "Delhi", state: "Delhi", latitude: 28.6500, longitude: 77.2000 },
  "SDPR": { name: "Sardar Patel Marg", division: "Delhi", state: "Delhi", latitude: 28.6000, longitude: 77.2000 },
  "SOJ": { name: "Sarojini Nagar", division: "Delhi", state: "Delhi", latitude: 28.5728, longitude: 77.1910 },
  "LDCY": { name: "Lodhi Colony", division: "Delhi", state: "Delhi", latitude: 28.5825, longitude: 77.2236 },
  "SWNR": { name: "Sewa Nagar", division: "Delhi", state: "Delhi", latitude: 28.5784, longitude: 77.2252 },
  "PZA": { name: "Palavantangal", division: "Chennai Central", state: "TamilNadu", latitude: 12.9895, longitude: 80.1863 },
  "AVD": { name: "Avadi", division: "Chennai Central", state: "TamilNadu", latitude: 13.1147, longitude: 80.1098 },
  "BZN": { name: "Bagnan", division: "Kharagpur", state: "West Bengal", latitude: 22.4671, longitude: 87.9702 },
  "PKU": { name: "Panskura", division: "Kharagpur", state: "West Bengal", latitude: 22.3956, longitude: 87.7419 },
  "MCA": { name: "Mecheda", division: "Kharagpur", state: "West Bengal", latitude: 22.4141, longitude: 87.8600 },
  "VLCY": { name: "Velachery", division: "Chennai", state: "Tamilnadu", latitude: 12.9758, longitude: 80.2205 },
  "PRGD": { name: "Perungudi", division: "Chennai", state: "Tamilnadu", latitude: 12.9654, longitude: 80.2461 },
  "TRMN": { name: "Taramani", division: "Chennai", state: "Tamilnadu", latitude: 12.9860, longitude: 80.2400 },
  "TYMR": { name: "Thiruvanmiyur", division: "Chennai", state: "Tamilnadu", latitude: 12.9827, longitude: 80.2634 },
  "INDR": { name: "Indira Nagar", division: "Chennai", state: "Tamilnadu", latitude: 12.9951, longitude: 80.2496 },
  "KTBR": { name: "Kasturba Nagar", division: "Chennai", state: "Tamilnadu", latitude: 12.9886, longitude: 80.1304 },
  "KTPM": { name: "Kotturpuram", division: "Chennai", state: "Tamilnadu", latitude: 13.0180, longitude: 80.2411 },
  "GWGR": { name: "Greenways Road", division: "Chennai", state: "Tamilnadu", latitude: 13.0219, longitude: 80.2529 },
  "MNDY": { name: "Mandaveli", division: "Chennai", state: "Tamilnadu", latitude: 13.0284, longitude: 80.2621 },
  "MTMY": { name: "Thirumayilai", division: "Chennai", state: "Tamilnadu", latitude: 13.0368, longitude: 80.2676 },
  "MLHS": { name: "Light House", division: "Chennai", state: "Tamilnadu", latitude: 13.0396, longitude: 80.2795 },
  "MTCN": { name: "Thiruvallikeni", division: "Chennai", state: "Tamilnadu", latitude: 13.0569, longitude: 80.2795 },
  "MCPK": { name: "Chepauk", division: "Chennai", state: "Tamilnadu", latitude: 13.0643, longitude: 80.2838 },
  "MCPT": { name: "Chintadripet", division: "Chennai", state: "Tamilnadu", latitude: 13.0750, longitude: 80.2698 },
  "MPKT": { name: "Chennai Park Town", division: "Chennai", state: "Tamilnadu", latitude: 13.0864, longitude: 80.2669 },
  "GDY": { name: "Guindy", division: "Chennai", state: "Tamilnadu", latitude: 13.0102, longitude: 80.2157 },
  "SP": { name: "Saidapet", division: "Chennai", state: "Tamilnadu", latitude: 13.0199, longitude: 80.2181 },
  "MKK": { name: "Kodambakkam", division: "Chennai", state: "Tamilnadu", latitude: 13.0535, longitude: 80.2255 },
  "NBK": { name: "Nungambakkam", division: "Chennai", state: "Tamilnadu", latitude: 13.0611, longitude: 80.2405 },
  "MSC": { name: "Chetput", division: "Chennai", state: "Tamilnadu", latitude: 13.0741, longitude: 80.2424 },
  "PEW": { name: "Perambur Loco Works", division: "Chennai", state: "Tamilnadu", latitude: 13.1083, longitude: 80.2257 },
  "PCW": { name: "Perambur Carriage Works", division: "Chennai", state: "Tamilnadu", latitude: 13.1117, longitude: 80.2412 },
  "VJM": { name: "Vyasarpadi Jeeva", division: "Chennai", state: "Tamilnadu", latitude: 13.1268, longitude: 80.2814 },
  "TNP": { name: "Tondiarpet", division: "Chennai", state: "Tamilnadu", latitude: 13.1278, longitude: 80.2896 },
  "KOK": { name: "Korukkupet", division: "Chennai", state: "Tamilnadu", latitude: 13.1186, longitude: 80.2780 },
  "MPK": { name: "Chennai Park", division: "Chennai", state: "Tamilnadu", latitude: 13.0827, longitude: 80.2707 },
  "MSF": { name: "Chennai Fort", division: "Chennai", state: "Tamilnadu", latitude: 13.0674, longitude: 80.2376 },
  "WST": { name: "Washermanpet", division: "Chennai", state: "Tamilnadu", latitude: 13.1343, longitude: 80.2791 },
  "BBQ": { name: "Basin Bridge", division: "Chennai", state: "Tamilnadu", latitude: 13.1065, longitude: 80.2753 },
  "RPM": { name: "Royapuram", division: "Chennai", state: "Tamilnadu", latitude: 13.1040, longitude: 80.2937 },
  "MMCC": { name: "Moore Market Complex", division: "Chennai", state: "Tamilnadu", latitude: 13.0832, longitude: 80.2742 },
  "MSB": { name: "Chennai Beach", division: "Chennai", state: "Tamilnadu", latitude: 13.0922, longitude: 80.2919 },
  "SSP": { name: "Santoshpur", division: "Sealdah", state: "West Bengal", latitude: 22.4870, longitude: 88.3871 },
  "TLG": { name: "Tollyganj", division: "Sealdah", state: "West Bengal", latitude: 22.4953, longitude: 88.3506 },
  "BGJT": { name: "Baghajatin", division: "Sealdah", state: "West Bengal", latitude: 22.4851, longitude: 88.3785 },
  "BRJ": { name: "Brace Bridge", division: "Sealdah", state: "West Bengal", latitude: 22.5256, longitude: 88.3002 },
  "DDC": { name: "Dum Dum Cant", division: "Sealdah", state: "West Bengal", latitude: 22.6200, longitude: 88.4200 },
  "BLN": { name: "Ballygunge", division: "Sealdah", state: "West Bengal", latitude: 22.5333, longitude: 88.3667 },
  "DHK": { name: "Dhakuria", division: "Sealdah", state: "West Bengal", latitude: 22.5074, longitude: 88.3701 },
  "EDG": { name: "Eden Garden", division: "Sealdah", state: "West Bengal", latitude: 22.5587, longitude: 88.3393 },
  "BEQ": { name: "Belur", division: "Howrah", state: "West Bengal", latitude: 22.6357, longitude: 88.3398 },
  "TPKR": { name: "Tikiapara", division: "Kharagpur", state: "West Bengal", latitude: 24.3989, longitude: 88.1827 },
  "LLH": { name: "Liluah", division: "Howrah", state: "West Bengal", latitude: 22.6171, longitude: 88.3191 },
  "BBT": { name: "Birati", division: "Sealdah", state: "West Bengal", latitude: 22.6592, longitude: 88.4384 },
  "MJT": { name: "Majerhat", division: "Sealdah", state: "West Bengal", latitude: 22.5193, longitude: 88.3222 },
  "KIRP": { name: "Khidirpur", division: "Sealdah", state: "West Bengal", latitude: 22.5421, longitude: 88.3190 },
  "PPGT": { name: "Princep Ghat", division: "Sealdah", state: "West Bengal", latitude: 22.5568, longitude: 88.3316 },
  "AGP": { name: "Agarpara", division: "Sealdah", state: "West Bengal", latitude: 22.6837, longitude: 88.3846 },
  "SRC": { name: "Santragachi Junction", division: "Kharagpur", state: "West Bengal", latitude: 22.5802, longitude: 88.2696 },
   "VVH": { name: "Vidyavihar", division: "Mumbai VT", state: "Maharashtra", latitude: 28.3870, longitude: 75.5772 },
  "TKNG": { name: "Tilak Nagar", division: "Mumbai VT", state: "Maharashtra", latitude: 19.0598, longitude: 72.9067 },
  "SVE": { name: "Sewri", division: "Mumbai VT", state: "Maharashtra", latitude: 19.0185, longitude: 72.9036 },
  "SNRD": { name: "Sandhurst Road", division: "Mumbai VT", state: "Maharashtra", latitude: 18.9609, longitude: 72.8394 },
  "RRD": { name: "Reay Road", division: "Mumbai VT", state: "Maharashtra", latitude: 18.9536, longitude: 72.8275 },
  "MRU": { name: "Matunga Road", division: "Mumbai Central", state: "Maharashtra", latitude: 19.0333, longitude: 72.8333 },
  "MTN": { name: "Matunga", division: "Mumbai VT", state: "Maharashtra", latitude: 19.0287, longitude: 72.8442 },
  "MEL": { name: "Marine Lines", division: "Mumbai Central", state: "Maharashtra", latitude: 18.9374, longitude: 72.8347 },
  "MSD": { name: "Bombay Masjid", division: "Mumbai VT", state: "Maharashtra", latitude: 18.9506, longitude: 72.8382 },
  "MX": { name: "Mahalaxmi", division: "Mumbai Central", state: "Maharashtra", latitude: 18.9774, longitude: 72.8065 },
  "DKRD": { name: "Dockyard Road", division: "Mumbai VT", state: "Maharashtra", latitude: 18.9882, longitude: 72.8548 },
  "CRD": { name: "Currey Road", division: "Mumbai VT", state: "Maharashtra", latitude: 18.9936, longitude: 72.8329 },
  "CTGN": { name: "Cotton Green", division: "Mumbai VT", state: "Maharashtra", latitude: 18.9862, longitude: 72.8441 },
  "CHF": { name: "Chunabhatti", division: "Mumbai VT", state: "Maharashtra", latitude: 19.0517, longitude: 72.8691 },
  "CHG": { name: "Chinchpokli", division: "Mumbai VT", state: "Maharashtra", latitude: 18.9833, longitude: 72.8333 },
  "BAP": { name: "CBD Belapur", division: "Mumbai VT", state: "Maharashtra", latitude: 19.0237, longitude: 73.0410 },
  "VVB": { name: "Viveka Vihar", division: "DLI", state: "Delhi", latitude: 28.4388, longitude: 77.0465 },
  "TKJ": { name: "Tilak Bridge", division: "DLI", state: "Delhi", latitude: 28.6280, longitude: 77.2374 },
  "SZM": { name: "Subji Mandi", division: "DLI", state: "Delhi", latitude: 28.6679, longitude: 77.2007 },
  "CSB": { name: "Shivaji Bridge", division: "DLI", state: "Delhi", latitude: 28.6262, longitude: 77.2181 },
  "OKA": { name: "Okhla", division: "DLI", state: "Delhi", latitude: 28.5254, longitude: 77.2801 },
  "MGP": { name: "Mongolpuri", division: "DLI", state: "Delhi", latitude: 28.6925, longitude: 77.0884 },
  "DSJ": { name: "Delhi Sadarjung", division: "DLI", state: "Delhi", latitude: 28.5633, longitude: 77.1912 },
  "DKZ": { name: "Kishanganj", division: "DLI", state: "Delhi", latitude: 26.1022, longitude: 87.9553 },
  "BHD": { name: "Badli", division: "DLI", state: "Delhi", latitude: 28.7403, longitude: 77.1514 },
  "GTNR": { name: "Gomati Nagar", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.8624, longitude: 81.0203 },
  "RANI": { name: "Rani", division: "Ajmer", state: "Rajasthan", latitude: 26.4499, longitude: 74.6399 },
  "MUT": { name: "Meerut Cantt.", division: "Delhi", state: "Uttar Pradesh", latitude: 28.9938, longitude: 77.6822 },
  "JTTN": { name: "Jorhat Town", division: "Tinsukia", state: "Assam", latitude: 26.7500, longitude: 94.2167 },
  "JUD": { name: "Jagadhri", division: "Ambala", state: "Haryana", latitude: 30.1689, longitude: 77.3019 },
  "GMO": { name: "Gomoh Jn.", division: "Dhanbad", state: "Jharkhand", latitude: 23.7957, longitude: 86.4304 },
  "COB": { name: "Coochbehar", division: "Alipudawar", state: "West Bengal", latitude: 26.3239, longitude: 89.4511 },
  "BNGN": { name: "Bongaigaon", division: "Rangia", state: "Assam", latitude: 26.5010, longitude: 90.5352 },
  "BRD": { name: "Bhandara Road", division: "Nagpur", state: "Maharashtra", latitude: 21.1667, longitude: 79.6500 },
  "UHL": { name: "Una", division: "Ambala", state: "Himachal Pradesh", latitude: 31.4649, longitude: 76.2691 },
  "KPLH": { name: "Kottipali", division: "Vijayawada", state: "Andhra Pradesh", latitude: 16.6996, longitude: 82.0421 },
  "ANSB": { name: "Anandpur Sahib", division: "Ambala", state: "Punjab", latitude: 31.2393, longitude: 76.5025 },
  "AO": { name: "Aonla", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.8411, longitude: 78.7953 },
  "BRK": { name: "Bahraich", division: "Lucknow", state: "Uttar Pradesh", latitude: 27.5708, longitude: 81.5980 },
  "BTC": { name: "Balaghat", division: "Nagpur", state: "Madhya Pradesh", latitude: 21.8129, longitude: 80.1838 },
  "JDB": { name: "Jagdalpur", division: "Waltair", state: "Chhattisgarh", latitude: 19.0700, longitude: 82.0300 },
  "PNF": { name: "Pangaon", division: "Secundrabad", state: "Maharashtra", latitude: 18.5896, longitude: 76.5965 },
  "BJO": { name: "Bijnor", division: "Moradabad", state: "Uttar Pradesh", latitude: 29.3724, longitude: 78.1358 },
  "BSC": { name: "Bulandshaher", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.4069, longitude: 77.8498 },
  "CUR": { name: "Churu", division: "Bikaner", state: "Rajasthan", latitude: 28.2923, longitude: 74.9666 },
  "NAD": { name: "Nagda", division: "Ratlam", state: "Madhya Pradesh", latitude: 23.4583, longitude: 75.4176 },
  "DHI": { name: "Dhule", division: "Bhusawal", state: "Maharashtra", latitude: 20.9800, longitude: 74.7800 },
  "FTS": { name: "Fathepur Sikri", division: "Agra Cantt.", state: "Uttar Pradesh", latitude: 27.0950, longitude: 77.6688 },
  "KTW": { name: "Kotdwara", division: "Moradabad", state: "Uttarakhand", latitude: 29.7461, longitude: 78.5222 },
  "HRS": { name: "Hathras", division: "Allahabad", state: "Uttar Pradesh", latitude: 27.6000, longitude: 78.0500 },
  "JJN": { name: "Jhunjhunu", division: "Jaipur", state: "Rajasthan", latitude: 28.1289, longitude: 75.3995 },
  "KGRA": { name: "Kangra", division: "Firozpur", state: "Himachal Pradesh", latitude: 32.0998, longitude: 76.2691 },
  "SRO": { name: "Sirathu", division: "Allahabad", state: "Uttar Pradesh", latitude: 25.6461, longitude: 81.3157 },
  "JONA": { name: "Johna", division: "Ranchi", state: "Jharkhand", latitude: 23.3500, longitude: 85.3300 },
  "LMP": { name: "Lakhimpur", division: "Rangiya", state: "Assam", latitude: 26.5680, longitude: 91.9759 },
  "LLJ": { name: "Lalganj", division: "Lucknow", state: "Uttar Pradesh", latitude: 25.0167, longitude: 82.3591 },
  "MGZ": { name: "Maharjganj", division: "Bihar", state: "Bihar", latitude: 26.1112, longitude: 84.5039 },
  "JDNX": { name: "Joginder Nagar", division: "Firozpur", state: "Himachal Pradesh", latitude: 31.9912, longitude: 76.7899 },
  "MSTH": { name: "Mibrik Tirath", division: "Moradabad", state: "Uttar Pradesh", latitude: 28.8411, longitude: 78.7953 },
  "MLJ": { name: "Mohanlal Ganj", division: "Lucknow", state: "Uttar Pradesh", latitude: 26.6871, longitude: 80.9842 },
  "DMV": { name: "Dimapur", division: "Lumding", state: "Nagaland", latitude: 25.9063, longitude: 93.7276 },
  "NDB": { name: "Nandurbar", division: "Mumbai", state: "Maharashtra", latitude: 21.3700, longitude: 74.2000 },
  "NRT": { name: "Narasaraopet", division: "Guntur", state: "Andhra Pradesh", latitude: 16.2349, longitude: 80.0493 },
  "NWD": { name: "Nawada", division: "Danapur", state: "Bihar", latitude: 24.8799, longitude: 85.5299 },
  "PTN": { name: "Patan", division: "Ahmedabad", state: "Gujarat", latitude: 23.8507, longitude: 72.1296 },
  "PBR": { name: "Porbandar", division: "Bhavnagar", state: "Gujarat", latitude: 21.6422, longitude: 69.6093 },
  "RBGJ": { name: "Robertshabj", division: "Allahabad", state: "Uttar Pradesh", latitude: 25.4448, longitude: 81.8432 },
  "SRE": { name: "Saharanpur", division: "Ambala", state: "Uttar Pradesh", latitude: 29.9597, longitude: 77.5491 },
  "SML": { name: "Shimla", division: "Ambala", state: "Himachal Pradesh", latitude: 31.1044, longitude: 77.1666 },
  "SIKR": { name: "Sikar", division: "Jaipur", state: "Rajasthan", latitude: 27.6154, longitude: 75.1259 },
  "STP": { name: "Sitapur", division: "Lucknow", state: "Uttar Pradesh", latitude: 27.5751, longitude: 80.6638 },
  "TZTB": { name: "Tezpur", division: "Rangiya", state: "Assam", latitude: 26.6512, longitude: 92.7838 },
  "PQE": { name: "Pawapuri", division: "Bihar", state: "Bihar", latitude: 25.1599, longitude: 85.5124 },
  "CAPE": { name: "Kanyakumari", division: "Tamilnadu", state: "Tamilnadu", latitude: 8.0883, longitude: 77.5385 }
};

// --- Modal and Global State for S-Kav ---
let skavModalInstance;
let currentPotentialSkavCard = null; // Card that might become S-Kav
let currentPotentialSkavCodeInput = null; // Its code input

// --- UI Control Functions ---
function showManual() {
    $('#manualSection').show();
    $('#uploadSection').hide();
    $('#stationContainer').empty().show();
    $('#addStationBtn').show();
    $('#finishManualInputBtn').text('Finish & Preview Stations').show();
    $('#submitContainer').hide();
    manualStationCount = 0;
    updateStationNumbers();
    currentPotentialSkavCard = null; // Reset context
    currentPotentialSkavCodeInput = null;
}

function showUpload() {
    $('#uploadSection').show();
    $('#manualSection').hide();
    $('#stationContainer').empty().show(); // Keep station container for Excel preview
    $('#submitContainer').hide();
    $('#uploadBtn').show();
    updateStationNumbers();
    currentPotentialSkavCard = null; // Reset context
    currentPotentialSkavCodeInput = null;
}

// --- Manual Station Input Functions ---

/**
 * Initiates adding a new station field.
 * Checks if the previous station's code is empty and prompts for S-Kav if necessary.
 */
function addStationField() {
    if (manualStationCount > 0) {
        const lastStationIdSuffix = `manual_${manualStationCount}`;
        const lastStationCard = document.getElementById(`stationCard_${lastStationIdSuffix}`);
        const lastStationCodeInput = document.getElementById(`StationCode${lastStationIdSuffix}`);

        // If last station's code is empty AND it's not already marked as S-Kav
        if (lastStationCodeInput && !lastStationCodeInput.value.trim() && (!lastStationCard || lastStationCard.dataset.isSkav !== 'true')) {
            $('#skavModalText').text(`Station ${manualStationCount}'s code is empty. Is it an S-Kav station (its code will be auto-generated from adjacent stations)? Or do you want to fill its code now?`);
            
            currentPotentialSkavCard = lastStationCard;
            currentPotentialSkavCodeInput = lastStationCodeInput;
            
            skavModalInstance.show();
            return; // Stop here; modal button actions will continue the process
        }
    }
    // If no modal was needed (e.g., first card, or previous card's code filled, or previous card already S-Kav)
    _proceedToAddActualStationField();
}

/**
 * Called from modal: Marks the current last station as S-Kav and proceeds to add a new station.
 */
function _handleModalConfirmSkav() {
    if (currentPotentialSkavCard && currentPotentialSkavCodeInput) {
        currentPotentialSkavCard.dataset.isSkav = 'true';
        currentPotentialSkavCodeInput.placeholder = "S-Kav (auto-gen)";
        // Optional: Visually distinguish S-Kav inputs, e.g., disable or style
        // $(currentPotentialSkavCodeInput).prop('disabled', true).addClass('skav-input-pending');
        // Change card header color to indicate S-Kav pending
        $(currentPotentialSkavCard).find('.card-header').removeClass('bg-primary').addClass('bg-warning text-dark');

    }
    skavModalInstance.hide();
    _proceedToAddActualStationField(); // Now add the *next* station
    // Reset context after use
    currentPotentialSkavCard = null;
    currentPotentialSkavCodeInput = null;
}

/**
 * Called from modal: Focuses on the empty station code input for manual filling.
 */
function _handleModalFillNow() {
    if (currentPotentialSkavCodeInput) {
        currentPotentialSkavCodeInput.focus();
        // Small visual cue or Bootstrap alert could be used here instead of window.alert
        // For example, highlight the input field or show a temporary message next to it.
        const feedbackEl = $(currentPotentialSkavCodeInput).closest('.card-body').find('.station-code-feedback');
        if (feedbackEl.length === 0) {
             $(currentPotentialSkavCodeInput).after('<div class="form-text text-danger station-code-feedback">Please fill in the station code.</div>');
        } else {
            feedbackEl.text('Please fill in the station code.').show();
        }
    }
    skavModalInstance.hide();
    // Reset context
    currentPotentialSkavCard = null;
    currentPotentialSkavCodeInput = null;
}

/**
 * Called from modal: Cancels adding a new station.
 */
function _handleModalCancelAdd() {
    skavModalInstance.hide();
    // Reset context
    currentPotentialSkavCard = null;
    currentPotentialSkavCodeInput = null;
}


/**
 * The core logic for creating and appending a new station card.
 */
function _proceedToAddActualStationField() {
    // Collapse the previously added card's body if it exists and is expanded
    // This refers to the card BEFORE the one we might have just marked S-Kav, or any card before the new one.
    if (manualStationCount > 0) {
        // Find the card that is truly the one before the *new* one we are about to create.
        // If currentPotentialSkavCard was set, manualStationCount is its number.
        // The new card will be manualStationCount + 1.
        // So, the card to collapse is manualStationCount.
        const prevStationToCollapseIdSuffix = `manual_${manualStationCount}`;
        const prevCollapseElement = document.getElementById(`collapse_${prevStationToCollapseIdSuffix}`);
        // Make sure we are not trying to collapse a non-existent element if currentPotentialSkavCard was the very first interaction.
        if (prevCollapseElement && prevCollapseElement.classList.contains('show')) {
             // Check if this card is the one we might have just interacted with via modal.
             // If it's an S-Kav, maybe we want it to stay open? For now, standard collapse.
            new bootstrap.Collapse(prevCollapseElement, { toggle: false }).hide();
        }
    }

    manualStationCount++; // This is the number for the NEW station card
    const container = document.getElementById("stationContainer");
    const stationIdSuffix = `manual_${manualStationCount}`;
    const cardWrapperId = `stationCard_${stationIdSuffix}`;

    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = cardWrapperId;

    cardWrapper.innerHTML = `
        <div class="card shadow p-0 h-100">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                 id="headerFor_${stationIdSuffix}"
                 data-bs-toggle="collapse"
                 data-bs-target="#collapse_${stationIdSuffix}"
                 aria-expanded="true"
                 aria-controls="collapse_${stationIdSuffix}"
                 style="cursor: pointer;">
                <span class="station-title-text">Station ${manualStationCount}</span>
                <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); removeStationCard('${cardWrapperId}')"></button>
            </div>
            <div class="collapse show" id="collapse_${stationIdSuffix}" aria-labelledby="headerFor_${stationIdSuffix}">
                <div class="card-body">
                    <label class="form-label">Station Code:</label>
                    <input type="text" class="form-control mb-2 station-code-input" id="StationCode${stationIdSuffix}" placeholder="Enter Station Code" oninput="this.value = this.value.toUpperCase()" maxlength="5">
                    <div class="form-text station-code-feedback mb-2"></div> <label class="form-label">Station Name:</label>
                    <input type="text" class="form-control mb-2 station-name-input" id="stationName${stationIdSuffix}" required>

                    <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                    <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic${stationIdSuffix}" min="0" required>

                    <label class="form-label">Onboard Slots:</label>
                    <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots${stationIdSuffix}" min="0" required>
                    
                    <label class="form-label">Stationary Kavach ID:</label>
                    <input type="number" class="form-control mb-2 kavach-id-input" id="KavachID${stationIdSuffix}" min="0">

                    <label class="form-label">Stationary Unit Tower Latitude:</label>
                    <input type="number" step="any" class="form-control mb-2 latitude-input" id="Lattitude${stationIdSuffix}">

                    <label class="form-label">Stationary Unit Tower Longitude:</label>
                    <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude${stationIdSuffix}">
                </div>
            </div>
        </div>
    `;
    container.appendChild(cardWrapper);
    setupStationCodeListener(cardWrapper, stationIdSuffix); // Setup listener for the new card
    updateStationNumbers();

    // Scroll the new card into the center of the view
    cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if ($('#stationContainer .station-card').length > 0) {
        $('#finishManualInputBtn').show();
    }
    $('#submitContainer').hide();
}


function removeStationCard(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
        const collapseId = card.querySelector('.collapse')?.id;
        if (collapseId) {
            const collapseInstance = bootstrap.Collapse.getInstance(document.getElementById(collapseId));
            if (collapseInstance) {
                collapseInstance.dispose();
            }
        }
        card.remove();
        // After removing a card, we might need to re-evaluate S-Kav statuses
        // For simplicity, this is not handled here but could be an enhancement
        updateStationNumbers(); 
        if ($('#stationContainer .station-card').length === 0) {
            $('#finishManualInputBtn').hide();
            $('#submitContainer').hide();
            manualStationCount = 0; // Reset if all cards removed
        } else {
            // Potentially trigger S-Kav updates if a removed card was part of an S-Kav triplet
            // This requires iterating and checking neighbors of S-Kav cards.
            // For now, manual re-entry might be needed if an S-Kav's neighbor is removed.
        }
    }
}

function updateStationNumbers() {
    let visibleStationIndex = 0;
    $('#stationContainer .station-card').each(function() {
        visibleStationIndex++;
        $(this).find('.station-title-text').text(`Station ${visibleStationIndex}`);
        // Note: This only updates the visual "Station X" title.
        // The IDs `manual_Y` remain based on the original manualStationCount at creation.
    });
     // If all cards are removed, reset the counter used for adding new ones.
    if (visibleStationIndex === 0) {
        manualStationCount = 0;
    } else {
         // Adjust manualStationCount to the highest existing card number if cards were removed from middle
         // This is tricky because IDs are fixed. A better approach is to always increment or manage a list of available IDs.
         // For now, manualStationCount will continue from where it left off unless all cards are gone.
         // If a robust re-numbering of IDs is needed, it's a more complex change.
         // The current solution should be fine as long as we derive numeric IDs for S-Kav logic from the 'manual_X' suffix.
    }
}

function finishManualInput() {
    if ($('#stationContainer .station-card').length > 0) {
        $('#stationContainer .station-card .collapse').each(function() {
            const collapseElement = this;
            if (!collapseElement.classList.contains('show')) {
                new bootstrap.Collapse(collapseElement, { toggle: false }).show();
            }
            const headerId = $(collapseElement).attr('aria-labelledby');
            if(headerId) {
                $(`#${headerId}`).attr('aria-expanded', 'true');
            }
        });
        $('#addStationBtn').show();
        $('#finishManualInputBtn').text('Expand All Cards').show();    
        $('#submitContainer').show();
    } else {
        alert("Please add at least one station.");
        $('#finishManualInputBtn').text('Finish & Preview Stations');
    }
}

function setupStationCodeListener(cardElement, stationIdSuffix) {
    const stationCodeInput = cardElement.querySelector(`#StationCode${stationIdSuffix}`);
    const nameEl = cardElement.querySelector(`#stationName${stationIdSuffix}`);
    const latEl = cardElement.querySelector(`#Lattitude${stationIdSuffix}`);
    const lonEl = cardElement.querySelector(`#Longtitude${stationIdSuffix}`);
    const feedbackEl = $(stationCodeInput).siblings('.station-code-feedback');


    stationCodeInput.addEventListener('input', () => {
        const code = stationCodeInput.value.toUpperCase().trim();
        const lookup = stationLookup[code];
        feedbackEl.hide(); // Hide feedback on new input

        if (lookup) {
            if (nameEl) nameEl.value = lookup.name || '';
            if (latEl) latEl.value = lookup.latitude || '';
            if (lonEl) lonEl.value = lookup.longitude || '';
        } else {
            // Optional: Clear if not found, or leave as is for manual entry
            // if (nameEl) nameEl.value = ''; 
        }

        // --- S-Kav Auto-fill Logic ---
        const currentNumericId = parseInt(stationIdSuffix.split('_')[1]);
        if (!currentNumericId) return; // Should not happen with 'manual_X'

        // Function to update an S-Kav station
        const attemptAutoFillSkav = (skavNumericId, code1, code2) => {
            const skavCard = document.getElementById(`stationCard_manual_${skavNumericId}`);
            if (skavCard && skavCard.dataset.isSkav === 'true') {
                const skavCodeInput = document.getElementById(`StationCodemanual_${skavNumericId}`);
                if (skavCodeInput && code1 && code2) {
                    skavCodeInput.value = `${code1}-${code2}`;
                    // $(skavCodeInput).prop('disabled', false).removeClass('skav-input-pending'); // Re-enable
                    $(skavCard).find('.card-header').removeClass('bg-warning text-dark').addClass('bg-primary'); // Reset header
                    delete skavCard.dataset.isSkav; // Mark as filled
                    skavCodeInput.dispatchEvent(new Event('input')); // Trigger its own lookup
                }
            }
        };

        // 1. Check if THIS card's input can complete a PREVIOUS S-Kav station (S-Kav is currentNumericId - 1)
        if (currentNumericId > 1) {
            const skavCandidateNumericId = currentNumericId - 1; // Potential S-Kav
            if (currentNumericId > 2) { // S-Kav needs a station before it
                const beforeSkavNumericId = currentNumericId - 2;
                const beforeSkavCodeInput = document.getElementById(`StationCodemanual_${beforeSkavNumericId}`);
                const codeBeforeSkav = beforeSkavCodeInput ? beforeSkavCodeInput.value.trim().toUpperCase() : null;
                attemptAutoFillSkav(skavCandidateNumericId, codeBeforeSkav, code); // code is current card's code
            } else { // S-Kav is station 1, this is station 2. Only possible if S-Kav was manually set and we allow prefix-less.
                // For A-B, station 1 cannot be S-Kav if it needs a preceding station.
                // If logic allows {CODE_OF_CARD_2}, then handle here. Current logic needs two codes.
            }
        }

        // 2. Check if THIS card's input can complete a NEXT S-Kav station (S-Kav is currentNumericId + 1)
        const nextNumericId = currentNumericId + 1;
        const afterSkavNumericId = currentNumericId + 2;
        const skavCandidateNextNumericId = nextNumericId;

        // Check if card 'afterSkavNumericId' exists
        const afterSkavCard = document.getElementById(`stationCard_manual_${afterSkavNumericId}`);
        if (afterSkavCard) {
            const afterSkavCodeInput = document.getElementById(`StationCodemanual_${afterSkavNumericId}`);
            const codeAfterSkav = afterSkavCodeInput ? afterSkavCodeInput.value.trim().toUpperCase() : null;
            attemptAutoFillSkav(skavCandidateNextNumericId, code, codeAfterSkav); // code is current card's code
        }
    });
}


// --- Data Submission and Excel Handling ---
function submitData() {
    const stationData = [];
    document.getElementById("loadingSpinner").style.display = "block";
    $('#loadingMessage').text('Processing... Please wait.');

    let allValid = true;
    $('#stationContainer .station-card').each(function(index) {
        const card = $(this);
        const stationVisualNumber = index + 1; // For error messages (based on current visual order)
        
        // Find the actual station ID suffix (e.g., "manual_X") for more robust field finding
        const cardId = card.attr('id');
        const idSuffix = cardId ? cardId.substring(cardId.indexOf('_') + 0) : ''; // includes the "manual_" or "excel_" part

        const nameInput = card.find(`#stationName${idSuffix}`);
        const stationCodeInput = card.find(`#StationCode${idSuffix}`);
        
        const name = nameInput.val() ? nameInput.val().trim() : '';
        const stationCodeValue = stationCodeInput.val() ? stationCodeInput.val().trim().toUpperCase() : '';

        const staticVal = parseInt(card.find(`#OptimumStatic${idSuffix}`).val()) || 0;
        const onboardSlotsVal = parseInt(card.find(`#onboardSlots${idSuffix}`).val()) || 0;
        const kavachIDVal = parseInt(card.find(`#KavachID${idSuffix}`).val()) || 0;
        const latitudeVal = parseFloat(card.find(`#Lattitude${idSuffix}`).val()) || null;
        const longitudeVal = parseFloat(card.find(`#Longtitude${idSuffix}`).val()) || null;

        // Validation
        let cardHasError = false;
        if (!name) {
            alert(`Station Name cannot be empty for Station displayed as #${stationVisualNumber} (ID: ${idSuffix}).`);
            nameInput.addClass('is-invalid');
            cardHasError = true;
        } else {
            nameInput.removeClass('is-invalid');
        }

        if (!stationCodeValue) {
             // Check if it was an S-Kav that failed to auto-generate
            if (card.data('isSkav') === 'true') {
                alert(`Station Code for S-Kav station displayed as #${stationVisualNumber} (ID: ${idSuffix}) could not be auto-generated. Please ensure adjacent station codes are filled or fill this manually.`);
            } else {
                alert(`Station Code cannot be empty for Station displayed as #${stationVisualNumber} (ID: ${idSuffix}).`);
            }
            stationCodeInput.addClass('is-invalid');
            cardHasError = true;
        } else {
            stationCodeInput.removeClass('is-invalid');
        }
        
        if(cardHasError){
            allValid = false;
            // Expand card if collapsed to show error
            const collapseElement = card.find('.collapse');
            if (collapseElement.length && !collapseElement.hasClass('show')) {
                new bootstrap.Collapse(collapseElement[0], { toggle: false }).show();
            }
        }


        if (allValid) { // Only push if this card passed its own validation step (within loop)
            stationData.push({
                name: name,
                StationCode: stationCodeValue,
                Static: staticVal,
                onboardSlots: onboardSlotsVal,
                KavachID: kavachIDVal,
                Lattitude: latitudeVal, // Corrected typo from Lattitude
                Longitude: longitudeVal
            });
        }
    });

    if (!allValid) {
        document.getElementById("loadingSpinner").style.display = "none";
        alert("Please correct the highlighted errors before submitting.");
        return; // Stop submission
    }
    
    if (stationData.length === 0 && $('#stationContainer .station-card').length > 0) {
        // This case implies allValid was false from the start or became false
        document.getElementById("loadingSpinner").style.display = "none";
        return; 
    }
    
    if (stationData.length === 0) {
        alert("No station data to submit. Please add some stations.");
        document.getElementById("loadingSpinner").style.display = "none";
        return;
    }

    fetch("/allocate_slots_endpoint", { // Your Flask endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stationData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.fileUrl) {
            checkFileReady(data.fileUrl);
        } else {
            alert(data.message || data.error || "Error generating file from server.");
            document.getElementById("loadingSpinner").style.display = "none";
        }
    })
    .catch(err => {
        alert("Submission Error: " + err.message);
        document.getElementById("loadingSpinner").style.display = "none";
    });
}

function uploadExcel() {
    $('#loadingSpinner').show();
    $('#loadingMessage').text('Uploading and processing Excel file...');
    const fileInput = document.getElementById("excelFile");
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select an Excel file.");
        $('#loadingSpinner').hide();
        return;
    }
    const formData = new FormData();
    formData.append("file", file);

    fetch("/upload_excel", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        $('#loadingSpinner').hide();
        if (result.error) {
            alert("Error: " + result.error); return;
        }
        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
            alert("No valid data found in Excel or invalid format."); return;
        }
        populateFieldsFromExcel(result.data);
        $('#manualSection').hide(); // Keep manual section hidden
        $('#uploadSection').hide(); 
        $('#stationContainer').show(); // Ensure station container is visible
        $('#submitContainer').show();
        // updateStationNumbers(); // Called by populateFieldsFromExcel
    })
    .catch(err => {
        alert("Failed to upload or process Excel file. " + err.message);
        $('#loadingSpinner').hide();
    });
}

function populateFieldsFromExcel(stationDataArray) {
    const container = document.getElementById("stationContainer");
    container.innerHTML = ""; // Clear previous entries
    manualStationCount = 0; // Reset for excel data, as IDs will be excel_X

    stationDataArray.forEach((station, index) => {
        // For Excel-populated cards, we use a different ID prefix to avoid collision with manual ones if we were to mix.
        // However, the current UI switches between manual and upload, clearing the container.
        // Using 'manualStationCount' here for consistency in ID generation if we ever merge.
        // Or, better, use a specific excel counter.
        const excelStationIndex = index + 1;
        const stationIdSuffix = `excel_${excelStationIndex}`; // Distinct suffix for Excel items
        const cardWrapperId = `stationCard_${stationIdSuffix}`;
        
        const cardWrapper = document.createElement("div");
        cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
        cardWrapper.id = cardWrapperId;

        // Normalize keys from Excel data (handle different possible capitalizations/spacings)
        const sCode = station["Station Code"] || station["station code"] || station["StationCode"] || '';
        const sName = station["Station Name"] || station["station name"] || station["StationName"] || station["name"] || '';
        const sStatic = station["Static"] || station["Optimum no. of Simultaneous Exclusive Static Profile Transfer"] || 0;
        const sOnboard = station["Onboard Slots"] || station["onboardSlots"] || station["onboardslots"] || 0;
        const sKavachID = station["Stationary Kavach ID"] || station["KavachID"] || station["kavachid"] || 0;
        const sLat = station["Stationary Unit Tower Lattitude"] || station["Lattitude"] || station["latitude"] || ''; // Corrected Lattitude typo
        const sLon = station["Stationary Unit Tower Longitude"] || station["Longitude"] || station["longitude"] || '';


        cardWrapper.innerHTML = `
            <div class="card shadow p-0 h-100">
                <div class="card-header bg-info text-white d-flex justify-content-between align-items-center"
                     id="headerFor_${stationIdSuffix}"
                     data-bs-toggle="collapse"
                     data-bs-target="#collapse_${stationIdSuffix}"
                     aria-expanded="true" 
                     aria-controls="collapse_${stationIdSuffix}"
                     style="cursor: pointer;">
                    <span class="station-title-text">Station ${excelStationIndex} (Excel)</span>
                    <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); removeStationCard('${cardWrapperId}')"></button>
                </div>
                <div class="collapse show" id="collapse_${stationIdSuffix}" aria-labelledby="headerFor_${stationIdSuffix}">
                    <div class="card-body">
                        <label class="form-label">Station Code:</label>
                        <input type="text" class="form-control mb-2 station-code-input" id="StationCode${stationIdSuffix}" placeholder="Enter Station Code" oninput="this.value = this.value.toUpperCase()" maxlength="5" value="${sCode}">
                        <div class="form-text station-code-feedback mb-2"></div>

                        <label class="form-label">Station Name:</label>
                        <input type="text" class="form-control mb-2 station-name-input" id="stationName${stationIdSuffix}" value="${sName}" required>

                        <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                        <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic${stationIdSuffix}" min="0" value="${sStatic}" required>

                        <label class="form-label">Onboard Slots:</label>
                        <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots${stationIdSuffix}" min="0" value="${sOnboard}" required>
                        
                        <label class="form-label">Stationary Kavach ID:</label>
                        <input type="number" class="form-control mb-2 kavach-id-input" id="KavachID${stationIdSuffix}" min="0" value="${sKavachID}">

                        <label class="form-label">Stationary Unit Tower Latitude:</label>
                        <input type="number" step="any" class="form-control mb-2 latitude-input" id="Lattitude${stationIdSuffix}" value="${sLat}">

                        <label class="form-label">Stationary Unit Tower Longitude:</label>
                        <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude${stationIdSuffix}" value="${sLon}">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(cardWrapper);
        // Excel cards also get the listener, though S-Kav logic primarily targets manual entry.
        // If an Excel card has an empty code and neighbors, it *could* be auto-filled if manually marked S-Kav, but that's not the primary design.
        setupStationCodeListener(cardWrapper, stationIdSuffix); 
    });

    if (stationDataArray.length > 0) {
        $('#submitContainer').show();
    } else {
        $('#submitContainer').hide();
        alert("No valid station data to populate from Excel.");
    }
    updateStationNumbers(); // Update visual numbering for Excel cards
}


function checkFileReady(fileUrl) {
    let attempts = 0;
    const maxAttempts = 20; 
    const checkInterval = 3000; 

    $('#loadingSpinner').show(); 
    $('#loadingMessage').text(`Preparing file for download. Please wait...`);

    function poll() {
        fetch(fileUrl, { method: "HEAD" })
        .then(response => {
            if (response.ok && response.status === 200) { 
                $('#loadingMessage').text('File ready! Starting download...');
                setTimeout(() => { 
                    window.location.href = fileUrl;
                    document.getElementById("loadingSpinner").style.display = "none";
                    $('#stationContainer').empty();
                    $('#submitContainer').hide();
                    // Reset to a default view after download
                    showManual(); // Or showUpload() or clear everything
                }, 1000);
            } else if (response.status === 404 || attempts >= maxAttempts) { 
                let message = response.status === 404 ? "File not found or not yet available." : "File processing timed out.";
                alert(message + " Please check the server or try again later.");
                document.getElementById("loadingSpinner").style.display = "none";
            } else { 
                attempts++;
                $('#loadingMessage').text(`Processing... Attempt ${attempts} of ${maxAttempts}. Status: ${response.status}`);
                setTimeout(poll, checkInterval);
            }
        })
        .catch(err => {
            alert("Error checking file readiness: " + err.message);
            document.getElementById("loadingSpinner").style.display = "none";
        });
    }
    poll();
}

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the Bootstrap modal instance
    const modalElement = document.getElementById('skavModal');
    if (modalElement) {
        skavModalInstance = new bootstrap.Modal(modalElement);
    } else {
        console.error("S-Kav Modal HTML element not found!");
    }

    // Setup modal button listeners
    $('#skavModalIsSkavBtn').on('click', _handleModalConfirmSkav);
    $('#skavModalFillNowBtn').on('click', _handleModalFillNow);
    $('#skavModalCancelAddBtn').on('click', _handleModalCancelAdd);
    
    // Initial UI setup
    showManual(); 
});