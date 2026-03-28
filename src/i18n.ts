export type Lang = 'ko' | 'en' | 'zh' | 'ja' | 'fr' | 'de' | 'es'
export type SkinTypeKey = 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal'

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

export const LANG_FULL_NAMES: Record<Lang, string> = {
  ko: '한국어 (Korean)',
  en: 'English',
  zh: '中文简体 (Chinese Simplified)',
  ja: '日本語 (Japanese)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  es: 'Español (Spanish)',
}

export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem('vtbio_lang') as Lang | null
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored
  } catch { /* SSR guard */ }
  const nav = navigator.language.toLowerCase()
  if (nav.startsWith('ko')) return 'ko'
  if (nav.startsWith('zh')) return 'zh'
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('fr')) return 'fr'
  if (nav.startsWith('de')) return 'de'
  if (nav.startsWith('es')) return 'es'
  return 'en'
}

export interface Translations {
  headerTitle: string
  headerSubtitle: string
  facePhoto: string
  uploadText: string
  gallery: string
  camera: string
  dragHint: string
  bodyInfo: string
  height: string
  weight: string
  skinTypeLabel: string
  skinTypes: Record<SkinTypeKey, { label: string; desc: string }>
  bmi: { underweight: string; normal: string; overweight: string; obese: string }
  startBtn: string
  loadingText: string
  loadingSubText: string
  reportTitle: string
  skinBadge: (type: string) => string
  morningRoutine: string
  eveningRoutine: string
  ingredientsTitle: string
  recommended: string
  avoid: string
  lifestyleTitle: string
  resetBtn: string
  cameraTitle: string
  cameraPermissionError: string
  serverError: string
  unknownError: string
}

export const translations: Record<Lang, Translations> = {
  ko: {
    headerTitle: '퍼스널 뷰티 분석',
    headerSubtitle: '사진과 체형 정보를 입력하면 맞춤 뷰티 솔루션을 제안해드려요.',
    facePhoto: '얼굴 사진',
    uploadText: '사진을 업로드하세요',
    gallery: '갤러리',
    camera: '카메라',
    dragHint: '드래그 앤 드롭도 가능해요',
    bodyInfo: '체형 정보',
    height: '키',
    weight: '몸무게',
    skinTypeLabel: '피부 타입',
    skinTypes: {
      dry: { label: '건성', desc: '당김·건조' },
      oily: { label: '지성', desc: '번들·모공' },
      combination: { label: '복합성', desc: 'T존 지성' },
      sensitive: { label: '민감성', desc: '자극·홍조' },
      normal: { label: '중성', desc: '균형·매끄러움' },
    },
    bmi: { underweight: '저체중', normal: '정상', overweight: '과체중', obese: '비만' },
    startBtn: '뷰티 분석 시작하기',
    loadingText: 'AI가 맞춤 리포트를 작성 중입니다…',
    loadingSubText: '잠시만 기다려주세요',
    reportTitle: '맞춤 뷰티 리포트',
    skinBadge: (type) => `${type} 피부`,
    morningRoutine: '아침 루틴',
    eveningRoutine: '저녁 루틴',
    ingredientsTitle: '성분 가이드',
    recommended: '추천 성분',
    avoid: '주의 성분',
    lifestyleTitle: '생활 습관 조언',
    resetBtn: '다시 분석하기',
    cameraTitle: '카메라',
    cameraPermissionError: '카메라 접근 권한이 필요합니다.\n브라우저 설정에서 카메라를 허용해주세요.',
    serverError: '서버 오류가 발생했습니다.',
    unknownError: '오류가 발생했습니다.',
  },
  en: {
    headerTitle: 'Personal Beauty Analysis',
    headerSubtitle: 'Upload a photo and enter your body info for a personalized beauty solution.',
    facePhoto: 'Face Photo',
    uploadText: 'Upload your photo',
    gallery: 'Gallery',
    camera: 'Camera',
    dragHint: 'Drag & drop also supported',
    bodyInfo: 'Body Info',
    height: 'Height',
    weight: 'Weight',
    skinTypeLabel: 'Skin Type',
    skinTypes: {
      dry: { label: 'Dry', desc: 'Tight & flaky' },
      oily: { label: 'Oily', desc: 'Shine & pores' },
      combination: { label: 'Combination', desc: 'T-zone oily' },
      sensitive: { label: 'Sensitive', desc: 'Reactive & red' },
      normal: { label: 'Normal', desc: 'Balanced' },
    },
    bmi: { underweight: 'Underweight', normal: 'Normal', overweight: 'Overweight', obese: 'Obese' },
    startBtn: 'Start Beauty Analysis',
    loadingText: 'AI is creating your personalized report…',
    loadingSubText: 'Please wait a moment',
    reportTitle: 'Personalized Beauty Report',
    skinBadge: (type) => `${type} Skin`,
    morningRoutine: 'Morning Routine',
    eveningRoutine: 'Evening Routine',
    ingredientsTitle: 'Ingredient Guide',
    recommended: 'Recommended',
    avoid: 'Avoid',
    lifestyleTitle: 'Lifestyle Tips',
    resetBtn: 'Analyze Again',
    cameraTitle: 'Camera',
    cameraPermissionError: 'Camera permission required.\nPlease allow camera access in your browser settings.',
    serverError: 'A server error occurred.',
    unknownError: 'An error occurred.',
  },
  zh: {
    headerTitle: '个性化美容分析',
    headerSubtitle: '上传照片并输入体型信息，获取专属美容方案。',
    facePhoto: '面部照片',
    uploadText: '上传您的照片',
    gallery: '相册',
    camera: '相机',
    dragHint: '也支持拖放上传',
    bodyInfo: '体型信息',
    height: '身高',
    weight: '体重',
    skinTypeLabel: '肤质类型',
    skinTypes: {
      dry: { label: '干性', desc: '紧绷·干燥' },
      oily: { label: '油性', desc: '油光·毛孔' },
      combination: { label: '混合性', desc: 'T区油性' },
      sensitive: { label: '敏感性', desc: '刺激·红肿' },
      normal: { label: '中性', desc: '均衡·光滑' },
    },
    bmi: { underweight: '体重不足', normal: '正常', overweight: '超重', obese: '肥胖' },
    startBtn: '开始美容分析',
    loadingText: 'AI正在生成您的个性化报告…',
    loadingSubText: '请稍候',
    reportTitle: '个性化美容报告',
    skinBadge: (type) => `${type}肤质`,
    morningRoutine: '早间护肤',
    eveningRoutine: '晚间护肤',
    ingredientsTitle: '成分指南',
    recommended: '推荐成分',
    avoid: '需避免成分',
    lifestyleTitle: '生活习惯建议',
    resetBtn: '重新分析',
    cameraTitle: '相机',
    cameraPermissionError: '需要相机访问权限。\n请在浏览器设置中允许访问相机。',
    serverError: '服务器发生错误。',
    unknownError: '发生错误。',
  },
  ja: {
    headerTitle: 'パーソナル美容分析',
    headerSubtitle: '写真と体型情報を入力して、あなただけの美容ソリューションを。',
    facePhoto: '顔写真',
    uploadText: '写真をアップロード',
    gallery: 'ギャラリー',
    camera: 'カメラ',
    dragHint: 'ドラッグ＆ドロップも対応',
    bodyInfo: '体型情報',
    height: '身長',
    weight: '体重',
    skinTypeLabel: '肌タイプ',
    skinTypes: {
      dry: { label: '乾燥肌', desc: '突っ張り·乾燥' },
      oily: { label: '脂性肌', desc: 'テカリ·毛穴' },
      combination: { label: '混合肌', desc: 'Tゾーン脂性' },
      sensitive: { label: '敏感肌', desc: '刺激·赤み' },
      normal: { label: '普通肌', desc: 'バランス良好' },
    },
    bmi: { underweight: '低体重', normal: '標準', overweight: '過体重', obese: '肥満' },
    startBtn: '美容分析を開始',
    loadingText: 'AIがあなたのレポートを作成中…',
    loadingSubText: 'しばらくお待ちください',
    reportTitle: 'パーソナル美容レポート',
    skinBadge: (type) => `${type}`,
    morningRoutine: 'モーニングルーティン',
    eveningRoutine: 'イブニングルーティン',
    ingredientsTitle: '成分ガイド',
    recommended: 'おすすめ成分',
    avoid: '注意成分',
    lifestyleTitle: '生活習慣アドバイス',
    resetBtn: 'もう一度分析',
    cameraTitle: 'カメラ',
    cameraPermissionError: 'カメラへのアクセス許可が必要です。\nブラウザの設定でカメラを許可してください。',
    serverError: 'サーバーエラーが発生しました。',
    unknownError: 'エラーが発生しました。',
  },
  fr: {
    headerTitle: 'Analyse Beauté Personnalisée',
    headerSubtitle: 'Téléchargez une photo et entrez vos données corporelles pour une solution beauté sur mesure.',
    facePhoto: 'Photo du visage',
    uploadText: 'Téléchargez votre photo',
    gallery: 'Galerie',
    camera: 'Caméra',
    dragHint: 'Glisser-déposer aussi supporté',
    bodyInfo: 'Informations corporelles',
    height: 'Taille',
    weight: 'Poids',
    skinTypeLabel: 'Type de peau',
    skinTypes: {
      dry: { label: 'Sèche', desc: 'Tiraillement' },
      oily: { label: 'Grasse', desc: 'Brillance' },
      combination: { label: 'Mixte', desc: 'Zone T grasse' },
      sensitive: { label: 'Sensible', desc: 'Réactive·rouge' },
      normal: { label: 'Normale', desc: 'Équilibrée' },
    },
    bmi: { underweight: 'Insuffisant', normal: 'Normal', overweight: 'Surpoids', obese: 'Obèse' },
    startBtn: "Démarrer l'analyse",
    loadingText: 'L\'IA crée votre rapport personnalisé…',
    loadingSubText: 'Veuillez patienter',
    reportTitle: 'Rapport Beauté Personnalisé',
    skinBadge: (type) => `Peau ${type}`,
    morningRoutine: 'Routine Matin',
    eveningRoutine: 'Routine Soir',
    ingredientsTitle: 'Guide des ingrédients',
    recommended: 'Recommandés',
    avoid: 'À éviter',
    lifestyleTitle: 'Conseils de mode de vie',
    resetBtn: 'Analyser à nouveau',
    cameraTitle: 'Caméra',
    cameraPermissionError: 'Autorisation de caméra requise.\nVeuillez autoriser la caméra dans les paramètres du navigateur.',
    serverError: "Une erreur serveur s'est produite.",
    unknownError: "Une erreur s'est produite.",
  },
  de: {
    headerTitle: 'Persönliche Beauty-Analyse',
    headerSubtitle: 'Laden Sie ein Foto hoch und geben Sie Ihre Körperdaten für eine maßgeschneiderte Beauty-Lösung ein.',
    facePhoto: 'Gesichtsfoto',
    uploadText: 'Foto hochladen',
    gallery: 'Galerie',
    camera: 'Kamera',
    dragHint: 'Drag & Drop ebenfalls möglich',
    bodyInfo: 'Körperinformationen',
    height: 'Größe',
    weight: 'Gewicht',
    skinTypeLabel: 'Hauttyp',
    skinTypes: {
      dry: { label: 'Trocken', desc: 'Spannend' },
      oily: { label: 'Fettig', desc: 'Glänzend' },
      combination: { label: 'Mischhaut', desc: 'T-Zone fettig' },
      sensitive: { label: 'Empfindlich', desc: 'Reaktiv·gerötet' },
      normal: { label: 'Normal', desc: 'Ausgeglichen' },
    },
    bmi: { underweight: 'Untergewicht', normal: 'Normal', overweight: 'Übergewicht', obese: 'Adipositas' },
    startBtn: 'Analyse starten',
    loadingText: 'KI erstellt Ihren persönlichen Bericht…',
    loadingSubText: 'Bitte warten',
    reportTitle: 'Persönlicher Beauty-Bericht',
    skinBadge: (type) => `${type}-Haut`,
    morningRoutine: 'Morgenroutine',
    eveningRoutine: 'Abendroutine',
    ingredientsTitle: 'Inhaltsstoff-Guide',
    recommended: 'Empfohlen',
    avoid: 'Zu vermeiden',
    lifestyleTitle: 'Lifestyle-Tipps',
    resetBtn: 'Erneut analysieren',
    cameraTitle: 'Kamera',
    cameraPermissionError: 'Kamerazugriff erforderlich.\nBitte erlauben Sie den Kamerazugriff in den Browsereinstellungen.',
    serverError: 'Ein Serverfehler ist aufgetreten.',
    unknownError: 'Ein Fehler ist aufgetreten.',
  },
  es: {
    headerTitle: 'Análisis de Belleza Personal',
    headerSubtitle: 'Sube una foto e ingresa tu información corporal para una solución de belleza personalizada.',
    facePhoto: 'Foto del rostro',
    uploadText: 'Sube tu foto',
    gallery: 'Galería',
    camera: 'Cámara',
    dragHint: 'También puedes arrastrar y soltar',
    bodyInfo: 'Información corporal',
    height: 'Altura',
    weight: 'Peso',
    skinTypeLabel: 'Tipo de piel',
    skinTypes: {
      dry: { label: 'Seca', desc: 'Tirante·seca' },
      oily: { label: 'Grasa', desc: 'Brillante·poros' },
      combination: { label: 'Mixta', desc: 'Zona T grasa' },
      sensitive: { label: 'Sensible', desc: 'Reactiva·rojez' },
      normal: { label: 'Normal', desc: 'Equilibrada' },
    },
    bmi: { underweight: 'Bajo peso', normal: 'Normal', overweight: 'Sobrepeso', obese: 'Obesidad' },
    startBtn: 'Iniciar análisis',
    loadingText: 'La IA está creando tu informe personalizado…',
    loadingSubText: 'Por favor espera',
    reportTitle: 'Informe de Belleza Personalizado',
    skinBadge: (type) => `Piel ${type}`,
    morningRoutine: 'Rutina Matutina',
    eveningRoutine: 'Rutina Nocturna',
    ingredientsTitle: 'Guía de ingredientes',
    recommended: 'Recomendados',
    avoid: 'Evitar',
    lifestyleTitle: 'Consejos de estilo de vida',
    resetBtn: 'Analizar de nuevo',
    cameraTitle: 'Cámara',
    cameraPermissionError: 'Se requiere permiso de cámara.\nPermite el acceso a la cámara en la configuración del navegador.',
    serverError: 'Se produjo un error del servidor.',
    unknownError: 'Se produjo un error.',
  },
}
