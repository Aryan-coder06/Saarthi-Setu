export const LANGUAGES = {
  'en-IN': 'English', 'hi-IN': 'हिंदी', 'as-IN': 'অসমীয়া', 'bn-IN': 'বাংলা',
  'ur-IN': 'اردو', 'kn-IN': 'ಕನ್ನಡ', 'ne-IN': 'नेपाली', 'ml-IN': 'മലയാളം',
  'kok-IN': 'कोंकणी', 'mr-IN': 'मराठी', 'ks-IN': 'کٲشُر', 'od-IN': 'ଓଡ଼ିଆ',
  'sd-IN': 'سنڌي', 'pa-IN': 'ਪੰਜਾਬੀ', 'sa-IN': 'संस्कृत', 'ta-IN': 'தமிழ்',
  'sat-IN': 'ᱥᱟᱱᱛᱟᱲᱤ', 'te-IN': 'తెలుగు', 'mni-IN': 'মৈতৈলোন্',
  'brx-IN': 'बरʼ', 'gu-IN': 'ગુજરાતી', 'mai-IN': 'मैथिली', 'doi-IN': 'डोगरी',
};
export const isLanguage = code => Object.hasOwn(LANGUAGES, code);
