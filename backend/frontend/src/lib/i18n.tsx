import { createContext, useContext, useEffect, useMemo, useState } from "react";

type LanguageCode = "en" | "hi" | "te";

type Dictionary = Record<string, string>;

const STORAGE_KEY = "finpilot_lang";

const translations: Record<LanguageCode, Dictionary> = {
  en: {
    "lang.english": "English",
    "lang.hindi": "Hindi",
    "lang.telugu": "Telugu",
    "app.switchUser": "Switch User",
    "app.logout": "Log Out",
    "app.openMenu": "Open user menu",
    "app.dashboard": "Dashboard",
    "splash.opening": "Opening login...",
    "splash.tap": "Tap anywhere to continue",
    "login.signIn": "Sign In",
    "login.createAccount": "Create Account",
    "login.existingSubtitle": "Continue with your existing account",
    "login.newSubtitle": "Create a new user profile for daily tracking",
    "login.existingUser": "Existing User",
    "login.newUser": "New User",
    "login.name": "Name",
    "login.email": "Email",
    "login.password": "Password",
    "login.enterName": "Your name",
    "login.enterEmail": "you@company.com",
    "login.enterPassword": "Enter password",
    "login.signingIn": "Signing in...",
    "login.creating": "Creating account...",
    "language.choose": "Choose Language",
    "language.title": "MSME Risk Intelligence",
    "language.subtitle": "AI-powered financial risk analysis for your business",
    "language.footer": "Secure • Private • AI-Powered",
    "input.title": "Financial Details",
    "input.dailySales": "Daily Sales (Current)",
    "input.dailyExpenses": "Daily Expenses (Current)",
    "input.receivables": "Receivables",
    "input.loanEmi": "Loan EMI",
    "input.cashBalance": "Cash Balance",
    "input.analyze": "Analyze Risk",
    "input.analyzing": "Analyzing...",
    "dashboard.title": "Dashboard",
    "dashboard.addToday": "Add Today's Data",
    "dashboard.uploadCsv": "Upload Historical CSV",
    "dashboard.uploadingCsv": "Uploading CSV...",
    "dashboard.keyIndicators": "Key Indicators",
    "dashboard.timeAnalysis": "Time Analysis",
    "dashboard.survivalAnalysis": "Survival Analysis",
    "result.title": "Risk Analysis",
    "result.score": "Financial Risk Score",
    "result.aiExplanation": "AI Explanation",
    "result.highestFix": "Highest Impact Fix",
    "result.viewDashboard": "View Dashboard",
    "explanation.title": "Risk Factors",
    "explanation.heading": "What is causing the risk?",
    "optimization.title": "Recommendations",
    "optimization.heading": "Recommended Actions",
    "impact.high": "High Impact",
    "impact.medium": "Medium Impact",
    "impact.low": "Low Impact",
  },
  hi: {
    "lang.english": "अंग्रेज़ी",
    "lang.hindi": "हिंदी",
    "lang.telugu": "तेलुगु",
    "app.switchUser": "यूज़र बदलें",
    "app.logout": "लॉग आउट",
    "app.openMenu": "यूज़र मेनू खोलें",
    "app.dashboard": "डैशबोर्ड",
    "splash.opening": "लॉगिन खुल रहा है...",
    "splash.tap": "जारी रखने के लिए कहीं भी टैप करें",
    "login.signIn": "साइन इन",
    "login.createAccount": "खाता बनाएं",
    "login.existingSubtitle": "अपने मौजूदा खाते से जारी रखें",
    "login.newSubtitle": "दैनिक ट्रैकिंग के लिए नया प्रोफ़ाइल बनाएं",
    "login.existingUser": "मौजूदा यूज़र",
    "login.newUser": "नया यूज़र",
    "login.name": "नाम",
    "login.email": "ईमेल",
    "login.password": "पासवर्ड",
    "login.enterName": "आपका नाम",
    "login.enterEmail": "you@company.com",
    "login.enterPassword": "पासवर्ड दर्ज करें",
    "login.signingIn": "साइन इन हो रहा है...",
    "login.creating": "खाता बनाया जा रहा है...",
    "language.choose": "भाषा चुनें",
    "language.title": "एमएसएमई रिस्क इंटेलिजेंस",
    "language.subtitle": "आपके व्यवसाय के लिए एआई आधारित जोखिम विश्लेषण",
    "language.footer": "सुरक्षित • निजी • एआई-संचालित",
    "input.title": "वित्तीय विवरण",
    "input.dailySales": "दैनिक बिक्री (वर्तमान)",
    "input.dailyExpenses": "दैनिक खर्च (वर्तमान)",
    "input.receivables": "प्राप्य राशि",
    "input.loanEmi": "ऋण ईएमआई",
    "input.cashBalance": "नकद शेष",
    "input.analyze": "जोखिम विश्लेषण करें",
    "input.analyzing": "विश्लेषण हो रहा है...",
    "dashboard.title": "डैशबोर्ड",
    "dashboard.addToday": "आज का डेटा जोड़ें",
    "dashboard.uploadCsv": "पुराना CSV अपलोड करें",
    "dashboard.uploadingCsv": "CSV अपलोड हो रहा है...",
    "dashboard.keyIndicators": "मुख्य संकेतक",
    "dashboard.timeAnalysis": "समय विश्लेषण",
    "dashboard.survivalAnalysis": "सर्वाइवल विश्लेषण",
    "result.title": "जोखिम विश्लेषण",
    "result.score": "वित्तीय जोखिम स्कोर",
    "result.aiExplanation": "एआई व्याख्या",
    "result.highestFix": "सबसे प्रभावी समाधान",
    "result.viewDashboard": "डैशबोर्ड देखें",
    "explanation.title": "जोखिम कारक",
    "explanation.heading": "जोखिम क्यों बढ़ रहा है?",
    "optimization.title": "सिफारिशें",
    "optimization.heading": "सुझाए गए कदम",
    "impact.high": "उच्च प्रभाव",
    "impact.medium": "मध्यम प्रभाव",
    "impact.low": "कम प्रभाव",
  },
  te: {
    "lang.english": "ఇంగ్లీష్",
    "lang.hindi": "హిందీ",
    "lang.telugu": "తెలుగు",
    "app.switchUser": "యూజర్ మార్చు",
    "app.logout": "లాగ్ అవుట్",
    "app.openMenu": "యూజర్ మెనూను తెరవండి",
    "app.dashboard": "డ్యాష్‌బోర్డ్",
    "splash.opening": "లాగిన్ తెరుచుకుంటోంది...",
    "splash.tap": "కొనసాగడానికి ఎక్కడైనా ట్యాప్ చేయండి",
    "login.signIn": "సైన్ ఇన్",
    "login.createAccount": "ఖాతా సృష్టించండి",
    "login.existingSubtitle": "మీ ఉన్న ఖాతాతో కొనసాగండి",
    "login.newSubtitle": "రోజువారీ ట్రాకింగ్ కోసం కొత్త ప్రొఫైల్ సృష్టించండి",
    "login.existingUser": "ఉన్న యూజర్",
    "login.newUser": "కొత్త యూజర్",
    "login.name": "పేరు",
    "login.email": "ఈమెయిల్",
    "login.password": "పాస్‌వర్డ్",
    "login.enterName": "మీ పేరు",
    "login.enterEmail": "you@company.com",
    "login.enterPassword": "పాస్‌వర్డ్ నమోదు చేయండి",
    "login.signingIn": "సైన్ ఇన్ అవుతోంది...",
    "login.creating": "ఖాతా సృష్టిస్తోంది...",
    "language.choose": "భాషను ఎంచుకోండి",
    "language.title": "ఎంఎస్ఎంఈ రిస్క్ ఇంటెలిజెన్స్",
    "language.subtitle": "మీ వ్యాపారానికి AI ఆధారిత ఫైనాన్షియల్ రిస్క్ విశ్లేషణ",
    "language.footer": "సురక్షితం • వ్యక్తిగతం • AI ఆధారితం",
    "input.title": "ఆర్థిక వివరాలు",
    "input.dailySales": "రోజువారీ అమ్మకాలు (ప్రస్తుత)",
    "input.dailyExpenses": "రోజువారీ ఖర్చులు (ప్రస్తుత)",
    "input.receivables": "వసూలు చేయాల్సినవి",
    "input.loanEmi": "లోన్ EMI",
    "input.cashBalance": "నగదు నిల్వ",
    "input.analyze": "రిస్క్ విశ్లేషించండి",
    "input.analyzing": "విశ్లేషణ జరుగుతోంది...",
    "dashboard.title": "డ్యాష్‌బోర్డ్",
    "dashboard.addToday": "ఈ రోజు డేటా జోడించండి",
    "dashboard.uploadCsv": "హిస్టారికల్ CSV అప్లోడ్ చేయండి",
    "dashboard.uploadingCsv": "CSV అప్లోడ్ అవుతోంది...",
    "dashboard.keyIndicators": "ముఖ్య సూచికలు",
    "dashboard.timeAnalysis": "కాల విశ్లేషణ",
    "dashboard.survivalAnalysis": "సర్వైవల్ విశ్లేషణ",
    "result.title": "రిస్క్ విశ్లేషణ",
    "result.score": "ఫైనాన్షియల్ రిస్క్ స్కోర్",
    "result.aiExplanation": "AI వివరణ",
    "result.highestFix": "అత్యధిక ప్రభావం కలిగించే పరిష్కారం",
    "result.viewDashboard": "డ్యాష్‌బోర్డ్ చూడండి",
    "explanation.title": "రిస్క్ కారకాలు",
    "explanation.heading": "రిస్క్ ఎందుకు పెరుగుతోంది?",
    "optimization.title": "సిఫార్సులు",
    "optimization.heading": "సూచించిన చర్యలు",
    "impact.high": "అధిక ప్రభావం",
    "impact.medium": "మధ్యస్థ ప్రభావం",
    "impact.low": "తక్కువ ప్రభావం",
  },
};

type I18nContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string) => string;
  tr: (text: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const dynamicTranslations: Record<Exclude<LanguageCode, "en">, Record<string, string>> = {
  hi: {
    "High outstanding customer payments": "ग्राहकों से बकाया भुगतान बहुत अधिक है",
    "High EMI burden compared to revenue": "राजस्व की तुलना में ईएमआई का बोझ अधिक है",
    "Low cash buffer to absorb expense shocks": "अचानक खर्च झेलने के लिए नकद बफर कम है",
    "Revenue has declined significantly in recent months": "पिछले महीनों में राजस्व में उल्लेखनीय गिरावट आई है",
    "Operating expenses are increasing rapidly": "संचालन खर्च तेजी से बढ़ रहे हैं",
    "Improve collection cycle or follow up on dues": "कलेक्शन साइकिल सुधारें या बकाया वसूली पर फॉलो-अप करें",
    "Refinance debt or reduce monthly repayment pressure": "कर्ज पुनर्वित्त करें या मासिक भुगतान दबाव कम करें",
    "Build emergency liquidity to cover at least one month of expenses":
      "कम से कम एक महीने के खर्च के लिए इमरजेंसी नकदी बनाएं",
    "Review pricing strategy, improve customer retention, or explore new revenue channels":
      "प्राइसिंग रणनीति की समीक्षा करें, ग्राहक बनाए रखें, या नए राजस्व चैनल खोजें",
    "Audit operational costs and reduce non-essential spending":
      "संचालन खर्च का ऑडिट करें और गैर-जरूरी खर्च कम करें",
    "Collect pending customer payments faster": "ग्राहकों से बकाया भुगतान तेजी से वसूलें",
    "Reduce monthly expenses": "मासिक खर्च कम करें",
    "Increase monthly sales": "मासिक बिक्री बढ़ाएं",
    "Recovering this amount can immediately improve cash availability and extend runway.":
      "यह राशि वसूलने से नकदी उपलब्धता तुरंत बेहतर होगी और रनवे बढ़ेगा।",
    "Reducing this monthly amount can move your business closer to break-even.":
      "यह मासिक राशि घटाने से आपका व्यवसाय ब्रेक-ईवन के करीब आएगा।",
    "Increasing sales by this amount can offset losses and improve stability.":
      "इतनी बिक्री बढ़ाने से नुकसान की भरपाई होगी और स्थिरता बढ़ेगी।",
    "Your business shows elevated risk based on the financial indicators provided.":
      "दिए गए वित्तीय संकेतकों के आधार पर आपके व्यवसाय में जोखिम अधिक दिख रहा है।",
    "Burn Rate": "खर्च दर",
    "Runway": "रनवे",
    "Collection": "वसूली",
    "N/A": "उपलब्ध नहीं",
    "Why is the risk high?": "जोखिम इतना अधिक क्यों है?",
    "Understand key risk factors": "मुख्य जोखिम कारकों को समझें",
    "Get Recommendations": "सिफारिशें देखें",
    "Actionable steps to reduce risk": "जोखिम घटाने के लिए लागू करने योग्य कदम",
    "Full summary & trends": "पूरा सारांश और ट्रेंड",
    "What is causing the risk?": "जोखिम किस कारण से बढ़ रहा है?",
    "These are the main factors currently increasing risk in your business.":
      "ये वे मुख्य कारक हैं जो अभी आपके व्यवसाय में जोखिम बढ़ा रहे हैं।",
    "Analyze your financial data first to view personalized risk drivers.":
      "व्यक्तिगत जोखिम कारण देखने के लिए पहले अपना वित्तीय डेटा विश्लेषित करें।",
    "Recommended Actions": "सुझाए गए कदम",
    "Start with these simple next steps to reduce risk.":
      "जोखिम घटाने के लिए इन सरल अगले कदमों से शुरू करें।",
    "Analyze your financial data first to view personalized recommendations.":
      "व्यक्तिगत सिफारिशें देखने के लिए पहले अपना वित्तीय डेटा विश्लेषित करें।",
    "High priority": "उच्च प्राथमिकता",
    "Driver": "कारण",
    "Action": "कदम",
    "Please sign in first before uploading CSV.": "CSV अपलोड करने से पहले कृपया साइन इन करें।",
    "CSV upload failed.": "CSV अपलोड विफल रहा।",
    "Imported": "आयात किया गया",
    "rows": "पंक्तियाँ",
    "failed": "विफल",
    "CSV upload timed out. Check backend server and try again.":
      "CSV अपलोड का समय समाप्त हो गया। बैकएंड सर्वर जांचें और फिर प्रयास करें।",
    "CSV upload failed due to network error.": "नेटवर्क त्रुटि के कारण CSV अपलोड विफल रहा।",
    "Revenue Trend": "राजस्व रुझान",
    "Improving": "सुधर रहा है",
    "Declining": "घट रहा है",
    "Shows whether your monthly sales are improving or declining over time.":
      "यह दिखाता है कि समय के साथ आपकी मासिक बिक्री बढ़ रही है या घट रही है।",
    "Cash Runway": "नकदी रनवे",
    "How long your available cash can sustain your current monthly expense level.":
      "आपकी उपलब्ध नकदी वर्तमान मासिक खर्च कितने समय तक संभाल सकती है।",
    "Expense Ratio": "खर्च अनुपात",
    "Monthly expenses divided by monthly sales. Lower percentage is healthier.":
      "मासिक खर्च ÷ मासिक बिक्री। कम प्रतिशत बेहतर है।",
    "Debt Service": "ऋण भुगतान स्थिति",
    "On Track": "सही दिशा में",
    "High Burden": "अधिक बोझ",
    "Indicates whether loan payments are manageable relative to monthly sales.":
      "यह बताता है कि मासिक बिक्री के मुकाबले ऋण भुगतान संभालने योग्य है या नहीं।",
    "Best Net Period": "सर्वश्रेष्ठ शुद्ध अवधि",
    "Weakest Net Period": "सबसे कमजोर शुद्ध अवधि",
    "Average Net": "औसत शुद्ध",
    "Latest Change": "नवीनतम परिवर्तन",
    "Sales": "बिक्री",
    "Expenses": "खर्च",
    "Sales Monthly Growth": "बिक्री मासिक वृद्धि",
    "Expense Monthly Growth": "खर्च मासिक वृद्धि",
    "No history yet. Add your first daily check-in to build time analysis.":
      "अभी इतिहास उपलब्ध नहीं है। समय विश्लेषण के लिए अपना पहला दैनिक चेक-इन जोड़ें।",
    "This trend is auto-estimated from your daily inputs and current financial load.":
      "यह रुझान आपके दैनिक इनपुट और वर्तमान वित्तीय स्थिति से स्वतः अनुमानित है।",
    "Estimated Days Left": "अनुमानित शेष दिन",
    "Monthly Loss": "मासिक नुकसान",
    "Break-Even Sales": "ब्रेक-ईवन बिक्री",
    "Suggested Improvements": "सुझाए गए सुधार",
    "Reduce receivables cycle to under 30 days": "प्राप्य चक्र को 30 दिनों से कम करें",
    "Build 3-month cash runway": "3 महीने का नकदी रनवे बनाएं",
    "Lower expense ratio below 80%": "खर्च अनुपात 80% से नीचे लाएं",
    "daily": "दैनिक",
    "weekly": "साप्ताहिक",
    "monthly": "मासिक",
    "Daily (30d)": "दैनिक (30 दिन)",
    "Weekly (12w)": "साप्ताहिक (12 सप्ताह)",
    "Monthly (3m)": "मासिक (3 माह)",
    "Guide me through dashboard": "डैशबोर्ड समझाएं",
    "Welcome to your dashboard": "आपके डैशबोर्ड में स्वागत है",
    "Start by adding today's data or uploading historical CSV to build accurate trends.":
      "सटीक ट्रेंड बनाने के लिए आज का डेटा जोड़ें या पुराना CSV अपलोड करें।",
    "Key indicators": "मुख्य संकेतक",
    "These cards quickly show whether revenue, expenses, debt pressure, and cash health are improving.":
      "ये कार्ड जल्दी दिखाते हैं कि राजस्व, खर्च, ऋण दबाव और नकदी स्थिति सुधर रही है या नहीं।",
    "Time analysis": "समय विश्लेषण",
    "Switch between daily, weekly, and monthly views to spot spikes, slowdowns, and seasonality.":
      "स्पाइक, मंदी और मौसमी बदलाव देखने के लिए दैनिक, साप्ताहिक और मासिक व्यू बदलें।",
    "Survival analysis": "सर्वाइवल विश्लेषण",
    "Track runway, days left, monthly loss, and break-even target to avoid cash crunch.":
      "कैश क्रंच से बचने के लिए रनवे, शेष दिन, मासिक नुकसान और ब्रेक-ईवन लक्ष्य ट्रैक करें।",
    "Suggested improvements": "सुझाए गए सुधार",
    "Follow these actions first to reduce risk fastest. Re-check daily after updates.":
      "जोखिम तेजी से घटाने के लिए पहले इन कदमों का पालन करें। अपडेट के बाद रोज़ दोबारा जांचें।",
    "Step": "चरण",
    "Skip": "छोड़ें",
    "Back": "पीछे",
    "Next": "अगला",
    "Done": "पूर्ण",
    "Guided Tour": "मार्गदर्शित टूर",
    "Show section": "सेक्शन दिखाएँ",
  },
  te: {
    "High outstanding customer payments": "కస్టమర్ల వద్ద పెండింగ్ చెల్లింపులు ఎక్కువగా ఉన్నాయి",
    "High EMI burden compared to revenue": "రెవెన్యూ‌తో పోల్చితే EMI భారం ఎక్కువగా ఉంది",
    "Low cash buffer to absorb expense shocks": "అనుకోని ఖర్చులను తట్టుకోవడానికి నగదు బఫర్ తక్కువగా ఉంది",
    "Revenue has declined significantly in recent months": "ఇటీవలి నెలల్లో రెవెన్యూ గణనీయంగా తగ్గింది",
    "Operating expenses are increasing rapidly": "నిర్వహణ ఖర్చులు వేగంగా పెరుగుతున్నాయి",
    "Improve collection cycle or follow up on dues":
      "వసూళ్ల చక్రాన్ని మెరుగుపరచండి లేదా బాకీలపై ఫాలో-అప్ చేయండి",
    "Refinance debt or reduce monthly repayment pressure": "రుణాన్ని రిఫైనాన్స్ చేయండి లేదా నెలసరి చెల్లింపు ఒత్తిడిని తగ్గించండి",
    "Build emergency liquidity to cover at least one month of expenses":
      "కనీసం ఒక నెల ఖర్చులను కవర్ చేయడానికి అత్యవసర నగదు నిల్వను పెంచండి",
    "Review pricing strategy, improve customer retention, or explore new revenue channels":
      "ధరల వ్యూహాన్ని సమీక్షించండి, కస్టమర్ నిలుపుదల పెంచండి లేదా కొత్త ఆదాయ మార్గాలు చూడండి",
    "Audit operational costs and reduce non-essential spending":
      "నిర్వహణ ఖర్చులను ఆడిట్ చేసి అవసరం లేని ఖర్చులను తగ్గించండి",
    "Collect pending customer payments faster": "పెండింగ్ కస్టమర్ చెల్లింపులను వేగంగా వసూలు చేయండి",
    "Reduce monthly expenses": "నెలసరి ఖర్చులను తగ్గించండి",
    "Increase monthly sales": "నెలసరి అమ్మకాలను పెంచండి",
    "Recovering this amount can immediately improve cash availability and extend runway.":
      "ఈ మొత్తాన్ని వసూలు చేస్తే నగదు అందుబాటు వెంటనే మెరుగై రన్‌వే పెరుగుతుంది.",
    "Reducing this monthly amount can move your business closer to break-even.":
      "ఈ నెలసరి మొత్తాన్ని తగ్గించడం ద్వారా మీ వ్యాపారం బ్రేక్-ఈవెన్‌కు దగ్గరవుతుంది.",
    "Increasing sales by this amount can offset losses and improve stability.":
      "ఈ మొత్తంలో అమ్మకాలు పెంచితే నష్టాలు తగ్గి స్థిరత్వం పెరుగుతుంది.",
    "Your business shows elevated risk based on the financial indicators provided.":
      "ఇచ్చిన ఆర్థిక సూచికల ఆధారంగా మీ వ్యాపారంలో ప్రమాదం ఎక్కువగా కనిపిస్తోంది.",
    "Burn Rate": "ఖర్చు రేటు",
    "Runway": "రన్‌వే",
    "Collection": "వసూళ్లు",
    "N/A": "అందుబాటులో లేదు",
    "Why is the risk high?": "రిస్క్ ఎందుకు ఎక్కువగా ఉంది?",
    "Understand key risk factors": "ముఖ్య రిస్క్ కారకాలను అర్థం చేసుకోండి",
    "Get Recommendations": "సిఫార్సులు పొందండి",
    "Actionable steps to reduce risk": "రిస్క్ తగ్గించడానికి అమలు చేయగల అడుగులు",
    "Full summary & trends": "పూర్తి సారాంశం & ట్రెండ్లు",
    "What is causing the risk?": "రిస్క్ పెరగడానికి కారణమేమిటి?",
    "These are the main factors currently increasing risk in your business.":
      "ఇవి ప్రస్తుతం మీ వ్యాపారంలో రిస్క్ పెంచుతున్న ప్రధాన కారకాలు.",
    "Analyze your financial data first to view personalized risk drivers.":
      "వ్యక్తిగత రిస్క్ కారణాలు చూడటానికి ముందుగా మీ ఆర్థిక డేటాను విశ్లేషించండి.",
    "Recommended Actions": "సూచించిన చర్యలు",
    "Start with these simple next steps to reduce risk.":
      "రిస్క్ తగ్గించడానికి ఈ సరళమైన తదుపరి అడుగులతో ప్రారంభించండి.",
    "Analyze your financial data first to view personalized recommendations.":
      "వ్యక్తిగత సిఫార్సులు చూడటానికి ముందుగా మీ ఆర్థిక డేటాను విశ్లేషించండి.",
    "High priority": "అత్యధిక ప్రాధాన్యత",
    "Driver": "కారణం",
    "Action": "చర్య",
    "Please sign in first before uploading CSV.":
      "CSV అప్లోడ్ చేయడానికి ముందు దయచేసి సైన్ ఇన్ చేయండి.",
    "CSV upload failed.": "CSV అప్లోడ్ విఫలమైంది.",
    "Imported": "దిగుమతి చేసినవి",
    "rows": "వరుసలు",
    "failed": "విఫలమయ్యాయి",
    "CSV upload timed out. Check backend server and try again.":
      "CSV అప్లోడ్ సమయం ముగిసింది. బ్యాకెండ్ సర్వర్‌ని తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",
    "CSV upload failed due to network error.": "నెట్‌వర్క్ లోపం వల్ల CSV అప్లోడ్ విఫలమైంది.",
    "Revenue Trend": "ఆదాయ ధోరణి",
    "Improving": "మెరుగవుతోంది",
    "Declining": "తగ్గుతోంది",
    "Shows whether your monthly sales are improving or declining over time.":
      "కాలక్రమంలో మీ నెలసరి అమ్మకాలు మెరుగుపడుతున్నాయా లేదా తగ్గుతున్నాయా అని చూపిస్తుంది.",
    "Cash Runway": "నగదు రన్‌వే",
    "How long your available cash can sustain your current monthly expense level.":
      "మీ అందుబాటులో ఉన్న నగదు ప్రస్తుత నెలసరి ఖర్చులను ఎంతకాలం భరిస్తుందో చూపిస్తుంది.",
    "Expense Ratio": "ఖర్చు నిష్పత్తి",
    "Monthly expenses divided by monthly sales. Lower percentage is healthier.":
      "నెలసరి ఖర్చులు ÷ నెలసరి అమ్మకాలు. శాతం తక్కువగా ఉంటే మంచిది.",
    "Debt Service": "రుణ చెల్లింపు స్థితి",
    "On Track": "సరైన మార్గంలో",
    "High Burden": "అధిక భారం",
    "Indicates whether loan payments are manageable relative to monthly sales.":
      "నెలసరి అమ్మకాలతో పోలిస్తే లోన్ చెల్లింపులు నిర్వహించగలిగేవా అనే విషయం తెలుపుతుంది.",
    "Best Net Period": "ఉత్తమ నికర కాలం",
    "Weakest Net Period": "అతి బలహీన నికర కాలం",
    "Average Net": "సగటు నికరము",
    "Latest Change": "తాజా మార్పు",
    "Sales": "అమ్మకాలు",
    "Expenses": "ఖర్చులు",
    "Sales Monthly Growth": "అమ్మకాల నెలసరి వృద్ధి",
    "Expense Monthly Growth": "ఖర్చుల నెలసరి వృద్ధి",
    "No history yet. Add your first daily check-in to build time analysis.":
      "ఇంకా చరిత్ర లేదు. టైమ్ విశ్లేషణ కోసం మీ మొదటి రోజువారీ చెక్-ఇన్ జోడించండి.",
    "This trend is auto-estimated from your daily inputs and current financial load.":
      "ఈ ధోరణి మీ రోజువారీ ఇన్‌పుట్లు మరియు ప్రస్తుత ఆర్థిక భారంతో స్వయంచాలకంగా అంచనా వేయబడింది.",
    "Estimated Days Left": "మిగిలిన అంచనా రోజులు",
    "Monthly Loss": "నెలసరి నష్టం",
    "Break-Even Sales": "బ్రేక్-ఈవెన్ అమ్మకాలు",
    "Suggested Improvements": "సూచించిన మెరుగుదలలు",
    "Reduce receivables cycle to under 30 days": "వసూళ్ల చక్రాన్ని 30 రోజుల కంటే తక్కువకు తీసుకురండి",
    "Build 3-month cash runway": "3 నెలల నగదు రన్‌వే నిర్మించండి",
    "Lower expense ratio below 80%": "ఖర్చు నిష్పత్తిని 80% కంటే దిగువకు తేయండి",
    "daily": "దినసరి",
    "weekly": "వారానికొకసారి",
    "monthly": "నెలసరి",
    "Daily (30d)": "దినసరి (30 రోజులు)",
    "Weekly (12w)": "వారానికొకసారి (12 వారాలు)",
    "Monthly (3m)": "నెలసరి (3 నెలలు)",
    "Guide me through dashboard": "డ్యాష్‌బోర్డ్‌ని అర్థం చేసుకునేలా గైడ్ చేయండి",
    "Welcome to your dashboard": "మీ డ్యాష్‌బోర్డ్‌కు స్వాగతం",
    "Start by adding today's data or uploading historical CSV to build accurate trends.":
      "ఖచ్చితమైన ట్రెండ్ల కోసం ఈ రోజు డేటా జోడించండి లేదా హిస్టారికల్ CSV అప్లోడ్ చేయండి.",
    "Key indicators": "ముఖ్య సూచికలు",
    "These cards quickly show whether revenue, expenses, debt pressure, and cash health are improving.":
      "ఈ కార్డులు ఆదాయం, ఖర్చులు, రుణ ఒత్తిడి, నగదు స్థితి మెరుగవుతున్నాయా అని త్వరగా చూపిస్తాయి.",
    "Time analysis": "కాల విశ్లేషణ",
    "Switch between daily, weekly, and monthly views to spot spikes, slowdowns, and seasonality.":
      "స్పైక్స్, మందగింపు, సీజనల్ మార్పులు చూడడానికి రోజువారీ/వారానికొకసారి/నెలసరి వ్యూలు మార్చండి.",
    "Survival analysis": "సర్వైవల్ విశ్లేషణ",
    "Track runway, days left, monthly loss, and break-even target to avoid cash crunch.":
      "క్యాష్ క్రంచ్ తప్పించడానికి రన్‌వే, మిగిలిన రోజులు, నెలసరి నష్టం, బ్రేక్-ఈవెన్ లక్ష్యాన్ని ట్రాక్ చేయండి.",
    "Suggested improvements": "సూచించిన మెరుగుదలలు",
    "Follow these actions first to reduce risk fastest. Re-check daily after updates.":
      "రిస్క్ త్వరగా తగ్గడానికి ఈ చర్యలను ముందుగా అనుసరించండి. అప్డేట్ల తర్వాత రోజూ మళ్లీ చూడండి.",
    "Step": "దశ",
    "Skip": "దాటవేయి",
    "Back": "వెనుకకు",
    "Next": "తర్వాత",
    "Done": "పూర్తి",
    "Guided Tour": "గైడెడ్ టూర్",
    "Show section": "సెక్షన్ చూపించు",
  },
};

const fragmentTranslations: Record<Exclude<LanguageCode, "en">, Array<[string, string]>> = {
  hi: [
    ["Risk is", "जोखिम स्तर"],
    ["Main issues:", "मुख्य समस्याएं:"],
    ["Start with:", "पहले यह करें:"],
    ["Target amount:", "लक्ष्य राशि:"],
    ["days", "दिन"],
    ["mo", "माह"],
    ["months", "माह"],
  ],
  te: [
    ["Risk is", "రిస్క్ స్థాయి"],
    ["Main issues:", "ప్రధాన సమస్యలు:"],
    ["Start with:", "మొదట చేయాల్సింది:"],
    ["Target amount:", "లక్ష్య మొత్తం:"],
    ["days", "రోజులు"],
    ["mo", "నెలలు"],
    ["months", "నెలలు"],
  ],
};

const translateDynamicText = (lang: LanguageCode, text: string): string => {
  const input = String(text || "").trim();
  if (!input || lang === "en") return input;
  const exact = dynamicTranslations[lang][input];
  if (exact) return exact;

  let out = input;
  for (const [src, tgt] of fragmentTranslations[lang]) {
    out = out.replaceAll(src, tgt);
  }
  return out;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<LanguageCode>("en");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "en" || raw === "hi" || raw === "te") {
      setLangState(raw);
    }
  }, []);

  const setLang = (nextLang: LanguageCode) => {
    setLangState(nextLang);
    localStorage.setItem(STORAGE_KEY, nextLang);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => translations[lang][key] || translations.en[key] || key,
      tr: (text: string) => translateDynamicText(lang, text),
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};

export const LANGUAGE_OPTIONS: { code: LanguageCode; labelKey: string }[] = [
  { code: "en", labelKey: "lang.english" },
  { code: "hi", labelKey: "lang.hindi" },
  { code: "te", labelKey: "lang.telugu" },
];
