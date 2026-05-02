import { TicketType } from './types';

export const EVENT_INFO = {
  name: "2026 Year-end Performance \"Walking with the Nature's Rarest Survivors\"",
  date: "14 Mei 2026",
  time: "07:30 - 12:00 WIB",
  location: "Makara Art Center, Universitas Indonesia, Kota Depok",
  organizer: "SD Lazuardi",
  eventDate: "2026-05-14T08:00:00", // For countdown
};

export const ADMIN_EMAILS = [
  "dini@lazuardi.sch.id",
  "titi@lazuardi.sch.id",
  "mira@lazuardi.sch.id",
  "finance@lazuardi.sch.id",
  "noviastuty@lazuardi.sch.id",
  "jadid@lazuardi.sch.id",
  "elyana@lazuardi.sch.id",
  "saidi@lazuardi.sch.id",
  "fina@lazuardi.sch.id",
  "sari@lazuardi.sch.id",
  "admin2@lazuardi.sch.id",
  "gc.sd@lazuardi.sch.id",
];

export const SEATING_LAYOUT = [
  { row: 'A', right: [1, 6], center: [7, 16], left: [17, 22] },
  { row: 'B', right: [1, 6], center: [7, 19], left: [20, 25] },
  { row: 'C', right: [1, 6], center: [7, 19], left: [20, 25] },
  { row: 'D', right: [1, 6], center: [7, 19], left: [20, 25] },
  { row: 'E', right: [1, 6], center: [7, 18], left: [19, 24], isVIP: true },
  { row: 'F', right: [1, 7], center: [8, 20], left: [21, 27], isVIP: true },
  { row: 'G', right: [1, 7], center: [8, 20], left: [21, 27] },
  { row: 'H', right: [1, 7], center: [8, 21], left: [22, 28] },
  { row: 'I', right: [1, 7], center: [8, 22], left: [23, 29] },
  { row: 'J', right: [1, 6], center: [7, 22], left: [23, 28] },
  { row: 'K', right: [1, 6], center: [7, 22], left: [23, 28] },
  { row: 'L', right: [1, 6], center: [7, 23], left: [24, 29] },
  { row: 'M', right: [1, 5], center: [6, 23], left: [24, 28] },
  { row: 'N', right: [1, 5], center: [6, 25], left: [26, 30] },
  { row: 'O', right: [1, 3], center: [4, 22], left: [23, 25] },
];

export const SESSIONS = [
  { id: "Sesi 1", name: "Sesi 1 – Fase A", time: "08.00 - 09.00 WIB" },
  { id: "Sesi 2", name: "Sesi 2 – Fase B", time: "09.30 - 10.30 WIB" },
  { id: "Sesi 3", name: "Sesi 3 – Fase C", time: "11.00 - 12.00 WIB" },
];

export const STUDENT_CLASSES = [
  "1 Asiatic Cheetah",
  "1 Snow Leopard",
  "1 Sumatran Tiger",
  "2 Aye Aye",
  "2 Blue Whale",
  "2 Pygmy Sloth",
  "3 Addax",
  "3 Anoa",
  "3 Saola",
  "4 Iberian Lynx",
  "4 Red Wolf",
  "5 Vaquita",
  "5 Zebra Shark",
  "6 Forest Owlet",
  "6 Red-crowned Crane"
];

export const STUDENTS_BY_CLASS: Record<string, string[]> = {
  "1 Asiatic Cheetah": [
    "Abhar Muhibb Akbari", "Adam Khaled Abrisam", "Adzkiya Shanum Adhyasta", "Aisha Raya Hazairin",
    "Albiana Dziklan Syaputra", "Aldebaran Shehzad Shaquille Irfanto", "Ali Mahdi", "Andi Beyfrina Rizaldy",
    "Arbijandra Maliq Arief", "Arka Narendra Sukandar", "Arshaka Genta Anurogo", "Arumi Anjani Malaika",
    "Azyra Brizzia Keynara", "Fannan Muhammad Althaf Himami", "Kalandra Rashaad Abqary", "Kawakibi Muhammad Alman",
    "Ken Niar Kirana Ahmad", "Khaileena Lacreasha Fawzi", "Khaira Alesha Rossi", "Lualka Arunada",
    "Luvino Akhtar Zalavsgi", "Mikail Edin Basheer", "Mikhaila Vallari Parveen", "Mimar Ali Abiyaqsa",
    "Rafaizan Kalandra Hasyi", "Rafif Adzka Palopo", "Rania Narakirana Ramadan", "Raviendra Bayu Anindya Ahmad",
    "Zafran Hanif Rayyan Siregar"
  ],
  "1 Snow Leopard": [
    "Akasa Biru Mardhani", "Aksa Gunadhya Mawardi", "Almira Haala Zakiya", "Altair Devendra Wiedagdo",
    "Cattleya Adeeva Sitanggang", "Delan Nafisha Nofrian", "Elisha Millie Rosad", "Ghanim Ardanu Kuasa",
    "Ghumaisha Rafailah Mashel", "Hafiyya Gemala Hatta", "Hyggefalry Abiyyu Rafardhan", "Ibnu Zhafran Amarullah",
    "Khansa Faliha Gultom", "Lantan Bentala", "Mashel Aemona Phramesvari", "Mikael Kasyafani Nurrakhman",
    "Mohammad Ridwan Basoeki", "Muhammad Aidil Farhan", "Muhammad El Rayyan Himazova", "Muhammad Keanu Razzan Saifudin",
    "Muhammad Rajendra Rezki", "Muhammad Zaydan Rayshiva Alfari", "Nadine Kinara Riwaldi", "Raelina Myiesha Almahyra",
    "Raihan Rafandra Putra Alfarizi", "Rasyadan Reyn Ramadhan", "Samudra Elbarra Prawira Hari", "Tijani Reychyta Anakata",
    "Zayn Azkalandra Malik Fidhiansyah"
  ],
  "1 Sumatran Tiger": [
    "Aaron Noorsatyo Fatwan", "Adam Zaidan Rachmat", "Ahmad Idris", "Alandhra Alfarabi Kurniawan",
    "Aleandra Mischa Djemat", "Aleesa Ali Assagaf", "Andy Abizar Xavier Muttaqi", "Bagas Athaf Sadawija",
    "Danish Keano Satriawan", "Devaneo Eithar Maulana", "Gentamas Abhimata Dhanurendra", "Gracia Adeleia Putry Pinem",
    "Hayransaffa Lussy Fahlevi", "Heluta Abbey Salam", "Ibrohim Prasetyo", "Jennaira Shirin Deryaksa",
    "Kahyang Askarahayu", "Kalandra Karim Gunawan", "Muhammad Abiyyu Al Ghifary", "Muhammad Airlangga Atharrazka Sonny",
    "Najwa Syifa Alaydrus", "Pratama Raditya Dirga Purnomo", "Qael Rasyid Alfaruq", "Raesha Humaira Permana",
    "Rafardhan Gema Ahsani", "Rumaisa Freissy Malayeka", "Rumasatya Arrasyid Negara", "Seica Clarisha Putri Humaira",
    "Zaydan Amarti Faaris"
  ],
  "2 Aye Aye": [
    "Abizar Ananta Daulay", "Abrisyam Azka Raffasya", "Andi Sirena Tatjana Arunika", "Annasya Adreena Saila",
    "Arjuna Abdul Khodir", "Arsy Mazaya Nur Fathia", "Athazaky Aryasuta", "Azkayra Putri Febriandysa",
    "Cendekia Khalil Naruna", "Danish Ammar Putra Kaslam", "Elmyra Azkadina Aprihansa", "Enzo Abhinaya",
    "Fauzan Adli Azhim", "Gavin Aldrich Tofano", "Hamas Syahid Izzudin", "Jingga Senja Renjana",
    "Kanawa Zuhri Hadikusumo", "Karenina Jasmine Alenaisha", "Laksmana Samudra Biru", "Muhamad Agratta Kafeel Aiichiro",
    "Muhammad Nail Ahsan", "Rashya Arneyva Daivani", "Rasya Zafran Aqila", "Rayyan Kizuna Attaya",
    "Sabrina Zaura Azkadina Putri", "Siraj Aldebaran Salvia", "Syifa Hafizhah Rochmadi Sofian", "Wisankara Elshanum Gasendra",
    "Xara Sasya Xavia"
  ],
  "2 Blue Whale": [
    "Adara Binar Ayra", "Ahmad Putra Rafasya Wiratama", "Ardiana Ariendra Putri Wibowo", "Arkana Fatharian Hadiwijoyo",
    "Arsyila Ayudia", "Azka Pradita Mahaprana", "Balqis Kirani Azzahra", "Basmah Kalih Maryam", "Biru Arundaya",
    "Bumi Antares Ghosan", "Damar Yusuf Ismail", "Devandra Elhasyiq Muazzam", "Faradibba Mecca Pramana",
    "Gaella Reyatara Devara", "Hagia Reswara Sasikirana", "Hamzah Alfarizi Wicaksana", "Hanif Muhammad Abqary Ramadhan",
    "Haza Arsyada Dien", "Kael Raditya Kusumodityo", "Kalandrya Aghnawistara Alfatih", "Kanindra Al Faheem Bhamakerti",
    "Keola Almahyra Shanum", "Kienan Ali Putra Nariko", "Meysha Azzahra Yuka Sugandi", "Muhammad Ziyan Alfarizy",
    "Radeva Keanu Ishaq", "Reynara Lashira Adzra", "Sabiya Hasna Ashalina", "Samudra Gaffiarsya Pramanda",
    "Syailendra Elnoor Adikara"
  ],
  "2 Pygmy Sloth": [
    "Adinda Khairunnisa Sumitro", "Andhara Mecca Aditama", "Ardito Wangga Nugroho", "Askara Hafidz Praditya",
    "Ayasha Cetta Sandyaputri", "Ayra Alifia Alfatunnisa", "Azka Fakhri Arrasyid", "Dillan Mikail Arianto",
    "Dimas Adiansyah Darundriyo", "Kennan Janaka", "Khawla Adeeva Shaheen", "Kilian Aldebaran Arfianto",
    "Kinnas Saskara Decha", "Muhammad Al Fatih", "Muhammad Ali Akbar", "Muhammad Reza Al Haddad",
    "Muhammad Zain Ravian Monrovia", "Nabil Ahsan Rais", "Nyimas Malayeka Diffa Dinillah", "Prabu Omar Pramadana",
    "Qeeran Almahyra Nataatmadja", "Qiandra Amarilly Shalikha", "Raneysha Adza Anindita", "Rayaka Kala Arsyha",
    "Rimba Gyan Albirru", "Senja Diandra Arutala", "Sitta Amali Rayyalindra", "Tavisha Mashel Wiraka",
    "Vishal Erdogan Al-hari", "Zavier Athakafeel Zulmi"
  ],
  "3 Addax": [
    "Abyra Brianna Keynara", "Ahmad Satoru Priguna", "Alienorania Shaline Zein", "Aliyan Akhtar Raja Sulaiman",
    "Alrafaeyza Muhammad Farzani", "Angkasa Shalih Dharmawan", "Arshaq Musa Mishary Ar Rasyid", "Bening Bintari",
    "Celia Sky Winata", "Daniswara Amru Nugroho", "Elvan Emrick Mubarok", "Fathian Assiera Putra",
    "Fayzan Abiyyu Chandratyawan", "Hanania Hanifah", "Keisha Aqila Ridwan", "Lupita Hirayana Dewi",
    "Malayeka Hafla Azkadina", "Muhammad Raffasya Alfarizqi", "Raditya Arsya Ramadian", "Rafania Amira Sakhi",
    "Raneysha Audra Winowod", "Rania Ayumi Eishennoraz", "Refrano Rahman Wijaya", "Teuku Afkarsyah Rajendraputra",
    "Zainab Uqayla Rahilah", "Zulfa Izzati Salamy"
  ],
  "3 Anoa": [
    "Aileen Nathania Nurvin", "Aleena Azzahra Tangangringit", "Alrafaeyza Manggala Putra Lintang", "Ananta Wikrama Amrullah",
    "Aozora Aqsani Permana", "Athalla Guiza Nugraha", "Bima Sakti Wicaksana Sudirman", "Dafin Khalif Pradipa",
    "Faleshia Sherry Anjanique", "Ghaizka Affiya Sarasvati Ramelan", "Izora Resyakila Maynata", "Kairav Atharva Lumizza",
    "Kavka Fattaha Mahameru", "Kenya Aletheia Khadija", "Khanza Qinara Alaydrus", "Khayra Amani Djemat",
    "Kusavero Gerrard Putra Wardhana", "Kyara Meazza Wibowo", "Muhammad Adam Abdillah", "Muhammad Alan Al Hasbi",
    "Muhammad Reza", "Nayyira Az Zahra", "Rafif Alfatih Pratama", "Revalia Aryono", "Ryuga Alvaro Atmasasmita",
    "Sarah Kinanthi Nadira", "Zihni Hamizan"
  ],
  "3 Saola": [
    "Abdul Karim Sumitro", "Ahmad Alkhalifi Khawarizmi", "Ahmad Azkavin Galanatha", "Alif Ashabul Kaff",
    "Almahyra Noura Kalandra", "Aruna Arkafasha Wahyudi", "Aurora Maheswari Prawiranata", "Darren Zabdan Abhinaya",
    "Dharma Harun Pradhana", "Endra Dipta Anugrah", "Gendis Dhatu Naladhipa", "Gionendra Barra Damarell",
    "Jacinta Khairan Katheera", "Khairendra Azzhafrani Fahryan", "Khayra Najmia Fauzan", "Khi Ranta Aryasatya",
    "Mashel Aisyaline Haaris", "Mikail Falah Kalandra", "Mosaluna Nataira Zulka", "Muhammad Leonard Adiwangsa",
    "Muhammad Riffat Al Hafidz Prabawa", "Myesha Kimmy Negara", "Nadin Ashana Akbar", "Nausheen Azkadina Puteri Hartikopermadi",
    "Princess Kayla Mutiara Pasha", "Raline Belvya Prasty", "Saverio Rasendria Akbar"
  ],
  "4 Iberian Lynx": [
    "Achmad Kaisar Kamil", "Afiqah Calista Dzahin", "Ahmad Aditya Sulaiman", "Aisyah Ayudia Inara",
    "Al Abbas Husein", "Alif Sadina Yori", "Anindya Shadira", "Arisha Audriella Riwaldi", "Arkamaya Anargya Radeva",
    "Asy-Syifa Sheza Seraphina", "Athalla Raffasha Pratama", "Atisha Camilla Zayn", "Audi Anindita Habibah",
    "Banyu Pranadipa", "Bisma Satrio Pranadipa", "Chalifatus Sampono Ichwan", "Deodelano Izqian Khaisan",
    "Ezra Ilyasa Mandela", "Jardin Khaleevu Rachman", "Kiandra Ayuri Maisadipta", "Kimmy Allura Almahyra",
    "Liderra Gamba Abdillah", "Muhammad Keenand Al Fatih", "Muhammad Mahdi", "Nayla Vania", "Prabu Zanki Setiawan",
    "Reyshaka Rangga Putra Wyatno", "Shanum Almahyra Arsa", "Shazfa Farzana Adriatika", "Syifa Ardiani"
  ],
  "4 Red Wolf": [
    "Arcilla Dienmaula Samsura", "Arsakha Bumi Sandyaputra", "Arsya Arjidin Putra Hurairah", "Atallah Mada Raharso Hadinoto",
    "Attar Karan Daniswara", "Daffa Yudha Al Akhtar", "Diandra Alika Fazianto", "Fay Qotrunnada Felisha",
    "Hanifa Humaira Hatta", "Kamilah Alkaff", "Kenar Dhamiri Suseno", "Kennet Bartelsi Ghosan",
    "Leandra Maliha Sakhi Alfitra", "Lorenzo Ahmad Adiwangsa", "Muhammad Khalifa Alby Hendrawan", "Muhammad Shadega Rais Imtiaz",
    "Muhammad Syahmi", "Mysha Mumtazah Arifiandi", "Qeenar Fathiya Nataatmadja", "Radeva Kamaha Satria",
    "Rasyid Olivier Khalid", "Rembuni Nurmay Ekanta", "Rezvan Kalandra Abqary", "Robi Tahsin Saniy",
    "Samantha Michelle Haloho", "Shabrina Qanita Ariwibowo", "Shakeel Abimanyu Arkananta", "Shavanaya Namora Simanjuntak",
    "Tirta Adecia Maheswara"
  ],
  "5 Vaquita": [
    "Abrar Abinaya Ardiansyah", "Ahdiat Sangkara Nusa", "Arganta Omar El Rafif", "Athar Ar Rifai Romli",
    "Ayra Kelana Persada", "Cahaya Mentari Anindya", "Danesh Abrar Hastomo", "Dania Hasna Zein",
    "Fachri Akbar Bachtiar", "Frenayya Amanta Naura", "Hiroshi Tama Syahputra", "Kalyana Adeira Maheswari",
    "Keanu Andrew Danendra Khotmie", "Keenan Arya Alkantara", "Kikandrya Vimala Prajnaniscita", "Kirana Keira Kawiswara",
    "Maritza Kamila Sunarsono", "Muhammad Arsyad Dimaputra", "Muhammad Arya Wibisana", "Muhammad Atharizz Rayyan Alfari",
    "Muhammad Hasan", "Muhammad Imam Al Ghazaly", "Priyagung Inggil Ibrahim Prabowo", "Rafasyaa Putra Adhyasta",
    "Ranendra Aria Bramantyo Ahmad", "Reynand Dzaky Aldandy", "Salma Zahrani Nayyara", "Shanell Aila Zharfirah",
    "Yasmine Shidqiya Ghaisani"
  ],
  "5 Zebra Shark": [
    "Alanis Kinara Fay", "Amira Sarah Adhitya", "Archizio Allrizal", "Armando Emranadipa",
    "Arzachel Rasendriya Angasto Joyo", "Fattih Amri Rachmat", "Ghani Nabhan Rais", "Iftina Assyabiya Rafisa",
    "Kamilah Azzahra Rochmadi Sofian", "Kenzo Nouvel Muharam", "Louis Archer Alvarendra", "Mahirza Elkhalifi Hutomo",
    "Majorina Mozza Assyifa", "Moksha Arkananta", "Muhammad Keanu Emir Alkhalifi", "Nabila Azzahra Shahab",
    "Nada Kalila Illiyas", "Pranaja Sangga Jagratara", "Quinn Syandanara Samsura", "Rafardhan Muhammad Athaya",
    "Raffasya Alaric Kurniawan", "Rafi Siddiq Rochman", "Ranggi Faraz Samudera", "Rasy Idzhar Kusuma",
    "Rasyid Ilman Kamil", "Rayandra Kasabian Ismail Kunto", "Shedira Alifya Sesamie", "Uthaila Maryam Parinduri",
    "Yasmin Amira Anjani", "Zaim Tsaqif Kusumawirachma"
  ],
  "6 Forest Owlet": [
    "Aksara Aisha Rivai", "Aleyza Madania Azkayla", "Alhazim Satria Legawa", "Aliyaa Nur Al Hasbi",
    "Almeer Haidhar Nugroho", "Amala Vini Antika", "Amirul Faid Mustaqim", "Arly Arjidin Putri Hurairah",
    "Arshavin Runako Zabran", "Aura Latissa Aqueena Holo", "Dylan Altair Panjisatrio", "Elshama Amata Indol",
    "Feora Alexandria Nurvin", "Gerry Aprilio", "Jasmine Adeeva Syahla", "Laksmana Tristan Nararya",
    "Malika Bestari Agustina", "Nadhira Kanikhaira Azwar", "Nadina Faradiba Ismail", "Nala Aruna Suseno",
    "Nara Guido Paramudya", "Prima Aerilyn Noorhafizah", "Reiko Kynazahra Santoso", "Renata Aryono",
    "Sabrina Khadija Rakhmat", "Sakha Dyandra Sulthan Yusuf", "Saladin Langit Setiawan", "Yasmin Aisha Faiha",
    "Zafran Yusuf Alvaro"
  ],
  "6 Red-crowned Crane": [
    "Abid Al Ameen", "Afra Hisyam Hasanah", "Aisyah Larasati", "Al Banna Bayanaka Piharto",
    "Andana Warih Amrullah", "Anisa Maulida Khumairah", "Arganta Sakha Daniswara Amriza", "Attar Rayyawi Pridiawan",
    "Dara Jingga Sabri", "Darrel Arya Putra Kaslam", "Evra Kamal Sasmita", "Fadya Arjani Widodo",
    "Fayola Carissa Dyansaputri", "Gaudia Yamassaka Kemas", "Geenesha Olivine", "Hania Syakira Gunawan",
    "Ibrahim Ali Assagaf", "Jessica Patricia Wijaya", "Kafa Uwais Mubarak", "Kayliefa Syalwa Ajiwibowo",
    "Muhammad Hilmi Alatas", "Nadine Aishalyra Dharmawan", "Nathan Alexander Bay", "Queensha Illona Salsabilla",
    "Raffandra Shan Ayub", "Rasendria Ranjana Jusuf", "Shan Afkari Ahza", "Zevanna Alesha Fazeela Ali",
    "Zufar Jausyan Akbar Wibowo"
  ]
};

export const TICKET_TYPES: TicketType[] = [
  {
    id: "reg-a",
    name: "Tiket Reguler PAT Fase A",
    price: 100000,
    description: "Akses 1 sesi sesuai fase. 1 tiket untuk 1 orang & 1 kursi.",
    sessions: ["Sesi 1"],
    availableFrom: "2026-04-28T06:30:00Z",
    availableUntil: "2026-04-28T08:30:00Z",
  },
  {
    id: "reg-b",
    name: "Tiket Reguler PAT Fase B",
    price: 100000,
    description: "Akses 1 sesi sesuai fase. 1 tiket untuk 1 orang & 1 kursi.",
    sessions: ["Sesi 2"],
    availableFrom: "2026-04-29T06:30:00Z",
    availableUntil: "2026-04-29T08:30:00Z",
  },
  {
    id: "reg-c",
    name: "Tiket Reguler PAT Fase C",
    price: 100000,
    description: "Akses 1 sesi sesuai fase. 1 tiket untuk 1 orang & 1 kursi.",
    sessions: ["Sesi 3"],
    availableFrom: "2026-05-04T06:30:00Z",
    availableUntil: "2026-05-04T08:30:00Z",
  },
  {
    id: "terusan-ab",
    name: "Tiket Terusan PAT Fase A dan B",
    price: 150000,
    description: "Akses 2 sesi sesuai fase. 1 tiket untuk 1 orang & 1 kursi.",
    sessions: ["Sesi 1", "Sesi 2"],
    availableFrom: "2026-04-30T06:30:00Z",
    availableUntil: "2026-04-30T08:30:00Z",
  },
  {
    id: "terusan-ac",
    name: "Tiket Terusan PAT Fase A dan C",
    price: 150000,
    description: "Akses 2 sesi sesuai fase. 1 tiket untuk 1 orang & 1 kursi.",
    sessions: ["Sesi 1", "Sesi 3"],
    availableFrom: "2026-04-30T06:30:00Z",
    availableUntil: "2026-04-30T08:30:00Z",
  },
  {
    id: "terusan-bc",
    name: "Tiket Terusan PAT Fase B dan C",
    price: 150000,
    description: "Akses 2 sesi sesuai fase. 1 tiket untuk 1 orang & 1 kursi.",
    sessions: ["Sesi 2", "Sesi 3"],
    availableFrom: "2026-04-30T06:30:00Z",
    availableUntil: "2026-04-30T08:30:00Z",
  },
];
