const componentRegexPatterns = {
  // Navigation Components
  Navbar: /<(?:Navbar|AppBar|Header)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Sidebar: /<(?:Sidebar|Drawer)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Menu: /<(?:Menu|DropdownMenu)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Breadcrumb: /<Breadcrumb(?:s)?\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Pagination: /<Pagination\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  TabBar: /<TabBar\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Input Components
  Button: /<Button\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  TextField: /<(?:TextField|Input)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  TextArea: /<TextArea\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Checkbox: /<Checkbox\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  RadioButton: /<(?:RadioButton|Radio)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Switch: /<Switch\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Slider: /<Slider\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  DatePicker: /<DatePicker\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  TimePicker: /<TimePicker\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  ColorPicker: /<ColorPicker\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  FileUpload: /<(?:FileUpload|FileInput)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Selection Components
  Dropdown: /<(?:Dropdown|Select)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Autocomplete: /<Autocomplete\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  MultiSelect: /<MultiSelect\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Chip: /<Chip\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Layout Components
  Card: /<Card\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Grid: /<Grid\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  List: /<List\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Table: /<Table\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Divider: /<Divider\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Accordion: /<(?:Accordion|Collapsible)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Tabs: /<Tabs\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Feedback Components
  Modal: /<(?:Modal|Dialog)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Toast: /<(?:Toast|Snackbar)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Alert: /<Alert\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  ProgressBar: /<ProgressBar\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Spinner: /<(?:Spinner|CircularProgress)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Tooltip: /<Tooltip\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Media Components
  Image: /<(?:Image|Img)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Avatar: /<Avatar\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Icon: /<Icon\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Carousel: /<Carousel\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Video: /<Video\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Form Components
  Form: /<Form\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  FormGroup: /<(?:FormGroup|FieldSet)\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Label: /<Label\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  HelperText: /<HelperText\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  ErrorMessage: /<ErrorMessage\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Data Display Components
  Badge: /<Badge\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Timeline: /<Timeline\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Tree: /<Tree\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Navigation Indicators
  Stepper: /<Stepper\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  BottomNavigation: /<BottomNavigation\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Layout Containers
  Container: /<Container\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Paper: /<Paper\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Overlay Components
  Drawer: /<Drawer\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Popover: /<Popover\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Specialized Components
  DataGrid: /<DataGrid\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  VirtualList: /<VirtualList\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  RichTextEditor: /<RichTextEditor\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Chart: /<Chart\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Map: /<Map\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Calendar: /<Calendar\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Accessibility Components
  SkipLink: /<SkipLink\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Structural Components
  Header: /<Header\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Footer: /<Footer\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Main: /<Main\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Section: /<Section\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,

  // Miscellaneous
  Toolbar: /<Toolbar\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Rating: /<Rating\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Skeleton: /<Skeleton\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g,
  Backdrop: /<Backdrop\s*(?:[^>]*\s*)*(?:\/?>|\s*\n*\s*\/>)/g
};

module.exports = { componentRegexPatterns };
