const { logger } = require('@/config/logging');
const path = require('path');

// Detect the programming language based on file extension
function detectLanguage(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const languageMap = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.java': 'Java',
    '.cs': 'C#',
    '.go': 'Go',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.rs': 'Rust',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.less': 'LESS',
  };
  return languageMap[extension] || 'Unknown';
}

// Detect the type of UI component based on content
function detectComponentType(content) {
  const componentPatterns = {
    // Navigation Components
    Navbar: /navbar|navigation bar|app bar|header/i,
    Sidebar: /sidebar|side navigation|drawer/i,
    Menu: /menu|dropdown menu|context menu/i,
    Breadcrumb: /breadcrumb|breadcrumbs/i,
    Pagination: /pagination|page navigator/i,
    TabBar: /tab bar|tabbed interface/i,

    // Input Components
    Button: /button|btn|clickable/i,
    TextField: /text field|input field|text input/i,
    TextArea: /textarea|text area|multiline input/i,
    Checkbox: /checkbox|check box|toggle box/i,
    RadioButton: /radio button|radio input|option button/i,
    Switch: /switch|toggle switch|on-off switch/i,
    Slider: /slider|range slider|slide control/i,
    DatePicker: /date picker|calendar picker|date input/i,
    TimePicker: /time picker|clock picker|time input/i,
    ColorPicker: /color picker|color chooser|palette/i,
    FileUpload: /file upload|file input|dropzone/i,

    // Selection Components
    Dropdown: /dropdown|select|combo box/i,
    Autocomplete: /autocomplete|typeahead|search suggest/i,
    MultiSelect: /multi-select|multiple select|tag input/i,
    Chip: /chip|tag|badge/i,

    // Layout Components
    Card: /card|info card|content box/i,
    Grid: /grid|flex grid|layout grid/i,
    List: /list|item list|list view/i,
    Table: /table|data table|grid view/i,
    Divider: /divider|separator|horizontal rule/i,
    Accordion: /accordion|collapsible|expandable panel/i,
    Tabs: /tabs|tab panel|tabbed content/i,

    // Feedback Components
    Modal: /modal|dialog|popup/i,
    Toast: /toast|snackbar|notification/i,
    Alert: /alert|warning|info box/i,
    ProgressBar: /progress bar|loading bar|status bar/i,
    Spinner: /spinner|loading indicator|progress spinner/i,
    Tooltip: /tooltip|hover info|info bubble/i,

    // Media Components
    Image: /image|img|picture/i,
    Avatar: /avatar|user icon|profile picture/i,
    Icon: /icon|glyph|symbol/i,
    Carousel: /carousel|slideshow|image slider/i,
    Video: /video|video player|media player/i,

    // Form Components
    Form: /form|input form|data entry/i,
    FormGroup: /form group|input group|field set/i,
    Label: /label|form label|input label/i,
    HelperText: /helper text|hint text|description text/i,
    ErrorMessage: /error message|validation message|form feedback/i,

    // Data Display Components
    Badge: /badge|status indicator|count indicator/i,
    Timeline: /timeline|event timeline|history view/i,
    Tree: /tree|tree view|hierarchical view/i,

    // Navigation Indicators
    Stepper: /stepper|step indicator|progress steps/i,
    BottomNavigation: /bottom navigation|footer navigation/i,

    // Layout Containers
    Container: /container|wrapper|content container/i,
    Paper: /paper|elevated surface|card-like/i,

    // Overlay Components
    Drawer: /drawer|side panel|slide-out panel/i,
    Popover: /popover|pop-up|floating panel/i,

    // Specialized Components
    DataGrid: /data grid|spreadsheet|excel-like/i,
    VirtualList: /virtual list|infinite scroll|windowed list/i,
    RichTextEditor: /rich text editor|wysiwyg|text formatting/i,
    Chart: /chart|graph|data visualization/i,
    Map: /map|geographic map|location view/i,
    Calendar: /calendar|date grid|event calendar/i,

    // Accessibility Components
    SkipLink: /skip link|skip to content|accessibility jump/i,

    // Structural Components
    Header: /header|page header|section header/i,
    Footer: /footer|page footer|site footer/i,
    Main: /main content|primary content|content area/i,
    Section: /section|content section|page section/i,

    // Miscellaneous
    Toolbar: /toolbar|action bar|button bar/i,
    Rating: /rating|star rating|score display/i,
    Skeleton: /skeleton|placeholder|loading placeholder/i,
    Backdrop: /backdrop|overlay|dim background/i,
  };

  for (const [type, pattern] of Object.entries(componentPatterns)) {
    if (pattern.test(content)) {
      return type;
    }
  }
  return 'Other';
}

// Detect the primary functionality of the code
function detectFunctionality(content) {
  const functionalityPatterns = {
    // State Management
    StateManagement:
      /useState|useReducer|createStore|useContext|Provider|Consumer|connect|mapStateToProps|useSelector|useDispatch|createSlice|configureStore|combineReducers|Redux|MobX|Recoil|Zustand|Jotai|Valtio/i,

    // Event Handling
    EventHandling:
      /onClick|addEventListener|removeEventListener|on\w+|handle\w+|emit|dispatch|subscribe|unsubscribe|eventEmitter|useCallback|useMemo/i,

    // Data Fetching and API Interaction
    DataFetching:
      /fetch|axios|useEffect|useQuery|useMutation|createAsyncThunk|HttpClient|RESTful|GraphQL|Apollo|swr|react-query|websocket|WebSocket|socketio|Socket\.IO/i,

    // Routing and Navigation
    Routing:
      /useRouter|useNavigate|useParams|useLocation|Route|Link|NavLink|history\.push|navigate|BrowserRouter|HashRouter|Switch|Routes|Outlet/i,

    // Authentication and Authorization
    Authentication:
      /login|logout|authenticate|jwt|JSON Web Token|OAuth|passport|bcrypt|hash|salt|session|cookie|localStorage|sessionStorage|useAuth|AuthProvider|PrivateRoute|isAuthenticated/i,

    // Styling and Theming
    Styling:
      /style|css|scss|sass|less|styled-components|css-in-js|className|Tailwind|Bootstrap|Material-UI|Chakra UI|useTheme|ThemeProvider|createTheme|makeStyles|StyleSheet/i,

    // Form Handling and Validation
    FormHandling:
      /onSubmit|handleSubmit|Formik|useForm|react-hook-form|yup|joi|validator|isValid|touched|errors|setFieldValue|getFieldProps|useFormik|Controller/i,

    // Animation and Transitions
    Animation:
      /animation|transition|transform|keyframes|animate|motion|framer-motion|react-spring|gsap|velocity|anime\.js|requestAnimationFrame|useSpring|useTransition|useAnimate/i,

    // Performance Optimization
    PerformanceOptimization:
      /useMemo|useCallback|memo|PureComponent|shouldComponentUpdate|React\.lazy|Suspense|code splitting|dynamic import|virtualization|windowing|react-window|react-virtualized/i,

    // State Persistence
    StatePersistence:
      /localStorage|sessionStorage|IndexedDB|cookies|redux-persist|localForage|useLocalStorage|useSessionStorage/i,

    // Internationalization and Localization
    Internationalization:
      /i18n|internationalization|localization|react-intl|react-i18next|formatMessage|useTranslation|LocaleProvider/i,

    // Error Handling and Logging
    ErrorHandling:
      /try|catch|throw|Error|ErrorBoundary|componentDidCatch|error logging|Sentry|LogRocket|useErrorHandler/i,

    // Testing
    Testing:
      /test|jest|enzyme|react-testing-library|@testing-library\/react|describe|it|expect|assert|mock|spy|stub|beforeEach|afterEach/i,

    // Data Visualization
    DataVisualization:
      /chart|graph|d3|recharts|victory|chart\.js|plotly|highcharts|echarts|canvas|svg/i,

    // Real-time Updates
    RealTimeUpdates:
      /websocket|WebSocket|socketio|Socket\.IO|real-time|live updates|polling|long polling|server-sent events|EventSource/i,

    // File Handling
    FileHandling:
      /File|Blob|FileReader|FormData|multipart\/form-data|upload|download|drag and drop|dropzone/i,

    // Accessibility
    Accessibility:
      /aria-|role=|tabIndex|focus management|keyboard navigation|screen reader|a11y|accessible|useA11y/i,

    // Code Splitting and Lazy Loading
    CodeSplitting: /React\.lazy|Suspense|dynamic import|import\(/i,

    // Server-Side Rendering
    ServerSideRendering:
      /getServerSideProps|getStaticProps|getInitialProps|renderToString|hydrate|isomorphic|universal/i,

    // State Machines
    StateMachines: /xstate|useStateMachine|createMachine|interpret|useMachine/i,

    // Dependency Injection
    DependencyInjection:
      /@Injectable|@Inject|provider|useInjection|container|tsyringe|InversifyJS/i,

    // Middleware
    Middleware:
      /middleware|applyMiddleware|thunk|saga|redux-thunk|redux-saga|redux-observable|epicMiddleware/i,

    // WebGL and 3D Rendering
    WebGLAnd3D:
      /WebGL|Three\.js|React Three Fiber|canvas|gl|shader|3D rendering|useThree|useFrame/i,

    // Progressive Web App Features
    PWAFeatures:
      /service worker|registerServiceWorker|workbox|manifest\.json|installable|push notifications|background sync/i,

    // Cryptography
    Cryptography: /crypto|encrypt|decrypt|hash|salt|cipher|AES|RSA|digital signature|HMAC/i,
  };

  const detectedFunctionalities = [];

  for (const [functionality, pattern] of Object.entries(functionalityPatterns)) {
    if (pattern.test(content)) {
      detectedFunctionalities.push(functionality);
    }
  }

  return detectedFunctionalities.length > 0 ? detectedFunctionalities : ['General'];
}

// Detect the library version
function detectLibraryVersion(content) {
  const versionPattern = /(?:version|v)\s*[=:]\s*["']?(\d+\.\d+(?:\.\d+)?)["']?/i;
  const match = content.match(versionPattern);
  return match ? match[1] : 'Unknown';
}

// Calculate code complexity (this is a simple implementation)
function calculateComplexity(content) {
  const lines = content.split('\n').length;
  const cyclomaticComplexity = (content.match(/if|for|while|switch|catch/g) || []).length;

  if (lines > 200 || cyclomaticComplexity > 10) {
    return 'High';
  } else if (lines > 100 || cyclomaticComplexity > 5) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

// Detect dependencies
function detectDependencies(content) {
  const importPattern = /import.*from\s+['"](.+)['"]/g;
  const requirePattern = /(?:const|let|var)\s+.*=\s+require\(['"](.+)['"]\)/g;

  const imports = [...content.matchAll(importPattern)].map((match) => match[1]);
  const requires = [...content.matchAll(requirePattern)].map((match) => match[1]);

  return [...new Set([...imports, ...requires])];
}

// Detect license (this is a simple implementation)
function detectLicense(content) {
  const licensePatterns = {
    MIT: /MIT License/i,
    Apache: /Apache License/i,
    GPL: /GNU General Public License/i,
    BSD: /BSD License/i,
  };

  for (const [license, pattern] of Object.entries(licensePatterns)) {
    if (pattern.test(content)) {
      return license;
    }
  }
  return 'Unknown';
}

function safeExecute(func, defaultValue) {
  try {
    return func();
  } catch (error) {
    logger.error(`Error executing function: ${error.message}`);
    return defaultValue;
  }
}

module.exports = {
  detectLanguage,
  detectComponentType,
  detectFunctionality,
  detectLibraryVersion,
  calculateComplexity,
  detectDependencies,
  detectLicense,
  safeExecute,
};
