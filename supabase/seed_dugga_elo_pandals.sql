-- Seed pandals from Downloads dugga-elo CSV (Kolkata only, not already in DB)
-- Source rows: 122 | already in DB: 22 | geocoded: 58 | skipped (no coords): 42
-- Geocoded via OSM Nominatim (name first, street-address retry).
-- Run in Supabase SQL Editor. Safe to re-run (ON CONFLICT DO NOTHING).

insert into pandals (name, slug, area, address, latitude, longitude, verified) values
  ('21 Palli', '21-palli', 'South Kolkata', '17 Bondel Rd Ballygunge, Kolkata', 22.529898, 88.370595, true),
  ('66 Pally', '66-pally', 'South Kolkata', '9/5A/1, Nepal Bhattacharya St, Kalighat, Kolkata', 22.490604, 88.370623, true),
  ('75 Palli', '75-palli', 'South Kolkata', '1/1C Debendra Ghosh Rd Bhowanipore, Kolkata', 22.533487, 88.344821, true),
  ('Adi Ballygunge Sarbojanin', 'adi-ballygunge-sarbojanin', 'South Kolkata', '41P Palm Ave Ballygunge Park, Kolkata', 22.531728, 88.372075, true),
  ('Bagbazar Pally Puja', 'bagbazar-pally-puja', 'North Kolkata', 'Girish Ave Sovabazar, Kolkata', 22.60293, 88.36752, true),
  ('Bagbazar Sarbojanin', 'bagbazar-sarbojanin', 'North Kolkata', '78 Bagbazar St, Kolkata', 22.604699, 88.366135, true),
  ('Baghajatin', 'baghajatin', 'South Kolkata', 'Chittaranjan Colony 6, Kolkata', 22.482739, 88.386671, true),
  ('Ballygunge Cultural', 'ballygunge-cultural', 'South Kolkata', '20 Lake View Rd, Kolkata', 22.515884, 88.355817, true),
  ('Barisha Yuva Brinda', 'barisha-yuva-brinda', 'West Kolkata & Behala', '13 Biren Roy Road W, Kolkata', 22.486997, 88.313183, true),
  ('Behala Natun Dal', 'behala-natun-dal', 'West Kolkata & Behala', '12/2 Auddy Bagan Basti Behala, Kolkata', 22.496287, 88.317652, true),
  ('Behala Shree Sangha', 'behala-shree-sangha', 'West Kolkata & Behala', 'James Long Sarani Bhairabitala Behala, Kolkata', 22.49791, 88.320363, true),
  ('Behala Young', 'behala-young', 'West Kolkata & Behala', '19 SN Roy Rd Sahapur, Kolkata', 22.510915, 88.323545, true),
  ('Belgachia Olaichandi', 'belgachia-olaichandi', 'North Kolkata', '97 Khudiram Bose Rd Belgachia, Kolkata', 22.604528, 88.382251, true),
  ('Belgachia Sadharan', 'belgachia-sadharan', 'North Kolkata', 'Tala Belgachia, Kolkata', 22.60753, 88.383246, true),
  ('Bhowanipur Durgotsav', 'bhowanipur-durgotsav', 'South Kolkata', 'Chandra Nath Chatterjee St, Kolkata', 22.534895, 88.345021, true),
  ('Boral Sukanta Sangha', 'boral-sukanta-sangha', 'South Kolkata', 'Sukanta Pally, Lakepally Rd, Boral, Kolkata', 22.44767, 88.377709, true),
  ('College Square', 'college-square', 'Central Kolkata', 'College St, Kolkata', 22.574525, 88.364464, true),
  ('Ekdalia Evergreen', 'ekdalia-evergreen', 'South Kolkata', '15 Ekdalia Rd, Kolkata', 22.521253, 88.36596, true),
  ('Forward Club', 'forward-club', 'South Kolkata', '27/B Kalidas Patitundi Ln Kalighat, Kolkata', 22.523125, 88.343633, true),
  ('Friends'' Union', 'friends-union', 'North Kolkata', '9 Bhabnath Sen St, Kolkata', 22.603033, 88.37436, true),
  ('Garpar Matri Mandir', 'garpar-matri-mandir', 'Central Kolkata', '16, Brindaban Mullick 1st Ln, Manicktala, Kolkata', 22.591144, 88.377569, true),
  ('Gouribari Sarbojanin', 'gouribari-sarbojanin', 'Central Kolkata', '4 Gouri Bari Ln Manicktala, Kolkata', 22.594579, 88.379144, true),
  ('Hathkhola Dutta Barir Durga Pujo', 'hathkhola-dutta-barir-durga-pujo', 'Central Kolkata', '78 Nimtala Ghat St, Kolkata 700005', 22.591867, 88.358261, true),
  ('Hazra Park Durgotsab', 'hazra-park-durgotsab', 'South Kolkata', 'Jatin Das Park, Patuapara, Bhowanipore, Kolkata', 22.524838, 88.346141, true),
  ('Hindustan Club', 'hindustan-club', 'South Kolkata', '37/B, Hindustan Rd, Dover Terrace, Ballygunge, Kolkata', 22.519509, 88.360593, true),
  ('Jodhpur Park', 'jodhpur-park', 'South Kolkata', '1D Jodhpur Park, Kolkata', 22.50414, 88.363944, true),
  ('Kabitirtha Saradotsav', 'kabitirtha-saradotsav', 'West Kolkata & Behala', '13/1 Ram Kamal St, Kolkata', 22.540466, 88.322897, true),
  ('Kalighat Milan Sangha', 'kalighat-milan-sangha', 'South Kolkata', '32 Harish Chatterjee St, Kolkata', 22.524509, 88.341076, true),
  ('Khidderpore Nabarag Saradotsav', 'khidderpore-nabarag-saradotsav', 'West Kolkata & Behala', '30A, Kidderpore, Kolkata', 22.53538, 88.320609, true),
  ('Khidderpore Palli Saradiya', 'khidderpore-palli-saradiya', 'West Kolkata & Behala', '16A Hem Chandra St, Kolkata', 22.541609, 88.320615, true),
  ('Maddox Square', 'maddox-square', 'South Kolkata', 'Garcha Ballygunge, Kolkata', 22.526296, 88.354656, true),
  ('Matri Mandir', 'matri-mandir', 'South Kolkata', '22 Bipin Pal Rd Manoharpukur, Kolkata', 22.519511, 88.35075, true),
  ('Mudiali Club', 'mudiali-club', 'South Kolkata', '37 SR Das Rd Mudiali, Kolkata', 22.510081, 88.346449, true),
  ('Naba Durga', 'naba-durga', 'South Kolkata', 'Garia Place, Kolkata', 22.462484, 88.380916, true),
  ('Nabin Sarkar St Sarbojanin', 'nabin-sarkar-st-sarbojanin', 'North Kolkata', '35/1A, Bagbazar St, Bidhan Sarani, Baghbazar, Kolkata', 22.591607, 88.372821, true),
  ('Nabin Sathi Club', 'nabin-sathi-club', 'West Kolkata & Behala', 'Ustad Amir Ali Khan Sarani Haridevpur, Kolkata', 22.470083, 88.338448, true),
  ('Naktala Udayan Sangha', 'naktala-udayan-sangha', 'South Kolkata', 'Naktala, Garia, Kolkata', 22.474491, 88.366575, true),
  ('Pally Bashi Brindo', 'pally-bashi-brindo', 'Dumdum', 'LIG Housing, Dutta Bagan, Paikpara, Kolkata', 22.59501, 88.38946, true),
  ('Park Circus Beniapukur United Puja Committee', 'park-circus-beniapukur-united-puja-committee', 'South Kolkata', 'Park St Park Circus, Kolkata', 22.543921, 88.363123, true),
  ('Phalguni Sangha', 'phalguni-sangha', 'South Kolkata', 'Ekdalia, Ballygunge, Kolkata', 22.52255, 88.366007, true),
  ('Rabindra Kanan', 'rabindra-kanan', 'North Kolkata', '329 Rabindra Sarani Ahiritola, Kolkata', 22.590711, 88.360099, true),
  ('Rajdanga', 'rajdanga', 'South Kolkata', 'Rajdanga Chakraborty Para, Kolkata', 22.514413, 88.392977, true),
  ('Salt Lake AK Block', 'salt-lake-ak-block', 'Salt Lake & Rajarhat', 'AK Block, Sector 2, Bidhannagar, Kolkata', 22.601014, 88.418865, true),
  ('Salt Lake FD Block', 'salt-lake-fd-block', 'Salt Lake & Rajarhat', 'FD Block, Sector 3, Bidhannagar, Kolkata', 22.567641, 88.418094, true),
  ('Samajsebi', 'samajsebi', 'South Kolkata', '24a Lake View Rd Kalighat, Kolkata', 22.514349, 88.355852, true),
  ('Sealdah Athletic Club', 'sealdah-athletic-club', 'Central Kolkata', 'Kaiser St Sealdah, Kolkata', 22.571027, 88.371874, true),
  ('Shyam Square', 'shyam-square', 'North Kolkata', 'Bidhan Sarani Shyam Bazar, Kolkata', 22.600828, 88.368332, true),
  ('Singhi Park Sarbojanin', 'singhi-park-sarbojanin', 'South Kolkata', '18/33 Dover Ln Ballygunge, Kolkata', 22.521137, 88.361888, true),
  ('Sreebhumi Sporting Club', 'sreebhumi-sporting-club', 'Dumdum', 'Canal St, near P.S, Sreebhumi, Lake Town, South Dumdum, Kolkata', 22.600318, 88.40259, true),
  ('Suruchi Sangha', 'suruchi-sangha', 'South Kolkata', '500-505 Station Rd New Alipore, Kolkata', 22.509097, 88.334183, true),
  ('Tala Park', 'tala-park', 'North Kolkata', 'Tala Park Rd Tala, Kolkata', 22.611671, 88.38419, true),
  ('Telenga Bagan', 'telenga-bagan', 'North Kolkata', '65 Adhar Chandra Das Ln Ultadanga, Kolkata', 22.594905, 88.385383, true),
  ('Uday Sangha', 'uday-sangha', 'South Kolkata', '32B, D.N. Ghosh Road, Bhowanipore, Kolkata', 22.533983, 88.341419, true),
  ('Udayan', 'udayan', 'West Kolkata & Behala', 'Hem Chandra St Andaman Dock, Kolkata', 22.545646, 88.321646, true),
  ('Udayan Pally', 'udayan-pally', 'West Kolkata & Behala', 'Diamond Harbour Rd Barisha, Kolkata', 22.467008, 88.307484, true),
  ('United Club', 'united-club', 'North Kolkata', '103, Ultadanga Main Road, Ultadanga, Kolkata', 22.591214, 88.391065, true),
  ('Vivekananda Sporting', 'vivekananda-sporting', 'West Kolkata & Behala', '66/A Vivekananda Park Paschim Putiary, Kolkata', 22.476316, 88.338593, true),
  ('Young Boys Club', 'young-boys-club', 'North Kolkata', '17 Tarachand Dutta St Kolutolla, Kolkata', 22.578883, 88.356965, true)
on conflict (slug) do nothing;

-- Skipped (no Nominatim coords inside Kolkata bbox) — add via /admin PandalManager:
--   22 Palli | 17 Priyanath Mallick Rd Bakul Bagan
--   24 Palli Udayan Sangha | 16 Haralal Das St Entally
--   25 Palli | 10 Gopal Ghosh Lane
--   26 Palli | 22/1B Mohan Chandra Rd
--   37 Palli | 10 Dr Kartik Bose St
--   74 Palli | 5B Monilal Banerjee Rd
--   75 Palli (Port) | 11C Ramanath Pal Rd Kidderpore
--   78 Palli | 4/4 Aftab Mosque Lane Alipore
--   Agradut 76 Palli | 27 Dhirendranath Ghosh Rd Bhowanipore
--   Baghbazar Haldar Bari er Pujo | 17/1 Kaliprasad Chakraborty St, Baghbazar, Kolkata 700003
--   Baishnab Ghata Patuli | Block E Baishnabghata Patuli Twp
--   Barisha Sarbojonin | 35 K K Roychowdhury Rd
--   Behala Aikya Sammilani | Chamrapatti Behala
--   Cossipore Naba Yubak Sangha | Rustam Ji Parsi Rd, Cossipore
--   Dum Dum Park Sarbojanin | 225/1, Dum Dum Park, South Dumdum
--   Golf Green Sarodotsab | LIG 1/2 Golf Green
--   Hari Ghosh Lane | Hari Ghosh St Manicktala
--   Jorasanko Sadharan Durgotsab Samiti | 34 Vivekananda Rd Jorasanko
--   Khelat Ghose er Durga Pujo | 47 Pathuriaghata St, Kolkata 700006
--   Khidderpore Sarbojanin | Mansatala Row
--   Kumartuli Park | 8B Abhay Mitra St Kumartuli
--   Md. Ali Park | Chittaranjan Ave College Square
--   Naktala Sammilani Club Padma-Shree | 19 Naktala Rd Keya Bagan
--   Nandana Yuba Sangha | 47 Nandana Park Behala
--   Nawpara Dadabhai Sangha | 79, AK Mukherjee Rd, Noapara, Palpara, Baranagar
--   Nimtala Sarbojanin | 16B Nimtala Ln Ahiritola
--   Padmapukur Barwari | 47A, Paddapukur Ln, Chakraberia
--   Paikpara 15 Palli | Gangulipara Paikpara
--   Pathuria Ghata 5 ER Pally | Malapara Santoshpur Jorabagan
--   Ram Mohan Sammilani | 4 Rammohan Roy Rd Garpar
--   RAMDULAL NIBAS er Durga Pujo | 67E Beadon St, Kolkata 700006
--   Rani Rashmoni er Durga Pujo | 13 Rani Rashmoni Rd, Janbazar, Kolkata 700013
--   Roychoudhury Barir Durga Pujo | 26 Sabarna Para Rd, Barisha, Kolkata 700008
--   Selimpur Pally | 110, Selimpur Rd, Dhakuria, Selimpur
--   Simla Bayam Samiti | 9B Simla Machuabazar
--   Sinthee Sarbojainin | 15B Roy Para Sinthee
--   Sovabazar 20 Palli Beniatola | Beniatola St Sovabazar
--   Sovabazar Rajbari | Raja Nabakrishna St, Sovabazar
--   Sovabazar Rajbarir Durga Pujo | 36 & 33 Raja Nabakrishna St, Sovabazar, Kolkata 700005
--   Srimani Barir Durga Pujo | 17 Mahendra Srimani St (Sukea St), Kolkata 700009
--   Taltala Children's Park (14 Palli) | Doctor Ln Ripon Street
--   Taltala Sarbojanin Lord Para | 3 Durga Charan Doctor Rd Maula Ali

-- verify: select area, count(*) from pandals group by area order by area;
