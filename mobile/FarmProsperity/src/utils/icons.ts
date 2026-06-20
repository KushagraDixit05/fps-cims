/**
 * Centralised icon exports for the FPS app.
 * All icons come from lucide-react-native.
 * Import from here — never import lucide directly in screens.
 */

export {
  // Navigation
  Home,
  Leaf,
  Store,
  Map,
  BarChart2,
  User,
  LogOut,
  Menu,
  // Location
  MapPin,
  // Actions
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  // Auth
  Eye,
  EyeOff,
  // Status
  Check,
  CheckCircle,
  XCircle,
  AlertTriangle,
  // Field problems
  Bug,
  CloudRain,
  TrendingDown,
  Sprout,
  // Data / misc
  Package,
  Inbox,
  Camera,
  FileBarChart,
  ClipboardList,
  Share2,
} from 'lucide-react-native';

/** Standard icon sizes used across the app. */
export const IconSize = {
  xs:  14,
  sm:  16,
  md:  20,
  lg:  24,
  xl:  28,
  tab: 22,
} as const;

/** Standard icon stroke width. */
export const IconStroke = 1.75;
