
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Settings, 
  LogOut, 
  Menu,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Check,
  UserCheck,
  List,
  LayoutGrid,
  Calendar,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  AlarmClock
} from 'lucide-react';

interface RemixIconProps {
  name: string;
  className?: string;
  size?: string | number;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  'dashboard-3-line': LayoutDashboard,
  'user-3-line': Users,
  'task-line': CheckSquare,
  'settings-3-line': Settings,
  'logout-box-line': LogOut,
  'menu-fold-line': Menu,
  'search-line': Search,
  'add-line': Plus,
  'eye-line': Eye,
  'edit-line': Edit,
  'delete-bin-line': Trash2,
  'checkbox-circle-line': CheckCircle,
  'user-shared-line': UserCheck,
  'list-check': List,
  'kanban-view': LayoutGrid,
  'calendar-line': Calendar,
  'moon-line': Moon,
  'sun-line': Sun,
  'notification-3-line': Bell,
  'arrow-down-s-line': ChevronDown,
  'close-line': X,
  'time-line': Clock,
  'alarm-warning-line': AlarmClock,
  'arrow-up-line': ArrowUp,
  'arrow-down-line': ArrowDown
};

export function RemixIcon({ name, className = '', size = '1em' }: RemixIconProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    return <CheckSquare className={className} size={size} />;
  }

  return <IconComponent className={className} size={size} />;
}

// Componentes específicos para ícones comuns
export const DashboardIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <LayoutDashboard {...props} />;

export const UserIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Users {...props} />;

export const TaskIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <CheckSquare {...props} />;

export const SettingsIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Settings {...props} />;

export const LogoutIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <LogOut {...props} />;

export const MenuIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Menu {...props} />;

export const SearchIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Search {...props} />;

export const AddIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Plus {...props} />;

export const EyeIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Eye {...props} />;

export const EditIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Edit {...props} />;

export const DeleteIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Trash2 {...props} />;

export const CheckIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <CheckCircle {...props} />;

export const TransferIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <UserCheck {...props} />;

export const ListIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <List {...props} />;

export const KanbanIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <LayoutGrid {...props} />;

export const CalendarIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Calendar {...props} />;

export const MoonIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Moon {...props} />;

export const SunIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Sun {...props} />;

export const NotificationIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <Bell {...props} />;

export const ArrowDownIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <ChevronDown {...props} />;

export const CloseIcon = (props: Omit<RemixIconProps, 'name'>) => 
  <X {...props} />;
