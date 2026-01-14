import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

// --- Types ---
type MenuItem = {
  id: string;
  title: string;
  icon: string;
  type: 'primary' | 'secondary' | 'settings' | 'account';
  onPress?: () => void;
  badge?: number;
};

// --- FIX YAHAN HAI ---
type HamburgerMenuProps = {
  isVisible: boolean;
  onClose: () => void;
  currentTheme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  onLogout?: () => void;
  syncStatus?: 'online' | 'offline';
  userName?: string;
  userEmail?: string;
  role?: 'student' | 'admin'; // <-- YAHAN 'role' PROP ADD KIYA
};
// --- FIX END ---

// --- Menu Item Definitions (Ab Role Ke Hisaab Se) ---

// Ye Student ke items hain
const studentMenuItems: MenuItem[] = [
  { id: '1', title: 'Dashboard', icon: 'dashboard', type: 'primary' },
  { id: '2', title: 'Mark Attendance', icon: 'check-circle', type: 'primary' },
  { id: '3', title: 'My Analytics', icon: 'analytics', type: 'primary' },
  { id: '4', title: 'Challenges', icon: 'flag', type: 'primary' },
  { id: '5', title: 'Attendance Calculator', icon: 'calculate', type: 'primary' },
  { id: '6', title: 'Achievements', icon: 'emoji-events', type: 'primary' },
  { id: '7', title: 'Class Groups', icon: 'groups', type: 'secondary' },
  { id: '8', title: 'Quiz History', icon: 'history', type: 'secondary' },
  { id: '9', title: 'Smart Reminders', icon: 'notifications', type: 'secondary', badge: 3 },
  { id: '11', title: 'Settings', icon: 'settings', type: 'settings' },
  { id: '13', title: 'Attendance Policy', icon: 'policy', type: 'settings' },
  { id: '14', title: 'Help & Support', icon: 'help', type: 'settings' },
  { id: '17', title: 'Profile', icon: 'person', type: 'account' },
];

// Ye Admin ke items hain
const adminMenuItems: MenuItem[] = [
  { id: '1', title: 'Admin Dashboard', icon: 'admin-panel-settings', type: 'primary' },
  { id: '2', title: 'Create Session', icon: 'add-task', type: 'primary' },
  { id: '3', title: 'Live Reports', icon: 'assessment', type: 'primary' },
  { id: '4', title: 'Manage Students', icon: 'manage-accounts', type: 'primary' },
  { id: '5', title: 'Approve P2P', icon: 'how-to-reg', type: 'primary' },
  { id: '11', title: 'Settings', icon: 'settings', type: 'settings' },
  { id: '14', title: 'Help & Support', icon: 'help', type: 'settings' },
  { id: '17', title: 'Profile', icon: 'person', type: 'account' },
];


// --- HamburgerMenu Component ---
const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isVisible,
  onClose,
  currentTheme = 'light',
  onThemeToggle,
  onLogout,
  syncStatus = 'online',
  userName = 'Student',
  userEmail = 'student@college.edu',
  role = 'student', // <-- 'role' ko yahan receive kiya
}) => {
  const slideAnim = React.useRef(new Animated.Value(-width)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;

  const isDark = currentTheme === 'dark';

  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible, slideAnim, overlayAnim]);

  // --- FIX YAHAN HAI ---
  // Role ke hisaab se menuItems select kiye
  // Common items (Theme toggle, Sync, Logout) ko alag se define kiya
  
  const commonSettingsItems: MenuItem[] = [
     { id: '12', title: 'Dark/Light Mode', icon: currentTheme === 'light' ? 'dark-mode' : 'light-mode', type: 'settings', onPress: onThemeToggle },
  ];
  
  const commonAccountItems: MenuItem[] = [
      { id: '18', title: 'Sync Status', icon: syncStatus === 'online' ? 'sync' : 'sync-disabled', type: 'account' },
      { id: '19', title: 'Logout', icon: 'logout', type: 'account', onPress: onLogout },
  ];

  // Role ke basis par menuItems ko combine kiya
  const menuItems = [
    ...(role === 'admin' ? adminMenuItems : studentMenuItems),
    ...commonSettingsItems,
    ...commonAccountItems,
  ].map((item, index, arr) => ({
      ...item,
      // onPress ko update kiya taaki menu close ho
      onPress: () => {
          if (item.onPress) {
            item.onPress(); // Original function (like onLogout, onThemeToggle)
          }
          // Agar 'Logout' ya 'Theme' nahi hai, tabhi menu close karo
          // (Kyunki onLogout aur onThemeToggle unka apna logic handle karte hain)
          if (item.id !== '19' && item.id !== '12') {
            onClose();
          }
          console.log(item.title);
      }
  }));
  // --- FIX END ---


  const getSectionTitle = (section: MenuItem['type']) => {
    switch (section) {
      case 'primary': return role === 'admin' ? 'Admin Tools' : 'Primary Navigation';
      case 'secondary': return 'Secondary Features';
      case 'settings': return 'Settings & Support';
      case 'account': return 'Account Management';
      default: return '';
    }
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    // Check if it's the first item OR if its type is different from the previous item
    const isFirstInSection = index === 0 || menuItems[index - 1].type !== item.type;
    
    return (
      <React.Fragment key={item.id}>
        {isFirstInSection && (
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            {getSectionTitle(item.type)}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.menuItem, isDark && styles.menuItemDark]}
          onPress={item.onPress} // Updated onPress yahan use ho raha hai
        >
          <View style={styles.menuItemLeft}>
            <Icon name={item.icon} size={22} color={isDark ? '#60A5FA' : '#1E40AF'} />
            <Text style={[styles.menuItemText, isDark && styles.menuItemTextDark]}>
              {item.title}
            </Text>
          </View>
          
          <View style={styles.menuItemRight}>
            {item.badge && item.badge > 0 && (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{item.badge}</Text>
              </View>
            )}
            <Icon name="chevron-right" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </View>
        </TouchableOpacity>
      </React.Fragment>
    );
  };

  if (!isVisible) return null;

  return (
    <>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          onPress={onClose} 
          activeOpacity={1} 
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.container, 
          isDark && styles.containerDark, 
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <View style={[styles.avatar, isDark && styles.avatarDark]}>
                <Icon name={role === 'admin' ? 'admin-panel-settings' : 'person'} size={32} color={isDark ? '#60A5FA' : '#1E40AF'} />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, isDark && styles.userNameDark]}>{userName}</Text>
                <Text style={[styles.userEmail, isDark && styles.userEmailDark]}>{userEmail}</Text>
              </View>
              <View style={[
                styles.statusIndicator, 
                syncStatus === 'online' ? styles.statusOnline : styles.statusOffline
              ]} />
            </View>
          </View>

          {/* Menu Items - FIXED SCROLLVIEW */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {menuItems.map((item, index) => renderMenuItem(item, index))}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, isDark && styles.footerDark]}>
            <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
              SmartAttendance v1.0.0
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

export default HamburgerMenu;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarDark: {
    backgroundColor: '#1E293B',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userNameDark: {
    color: '#F9FAFB',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  userEmailDark: {
    color: '#9CA3AF',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#EF4444',
  },
  scrollView: {
    flex: 1, 
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 24, 
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleDark: {
    color: '#9CA3AF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemDark: {
    backgroundColor: 'transparent',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 12,
  },
  menuItemTextDark: {
    color: '#E5E7EB',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerDark: {
    borderTopColor: '#374151',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerTextDark: {
    color: '#9CA3AF',
  },
});