import React from 'react'; // Removed 'useState'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Removed HamburgerMenu import

// --- Define Props (UPDATED) ---
type TopbarProps = {
  pageTitle?: string; 
  statusBarHeight?: number; 
  notificationCount?: number;
  userImage?: string; 
  onPressNotifications?: () => void; 
  onPressProfile?: () => void; 
  theme?: 'light' | 'dark'; 
  syncStatus?: 'online' | 'offline'; 
  
  // --- ADDED ---
  onMenuPress?: () => void; // Function to open the menu

  // --- REMOVED ---
  // onThemeToggle, onLogout, userName, userEmail are all gone
};

// --- Topbar Component (UPDATED) ---
const Topbar: React.FC<TopbarProps> = ({
  statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  notificationCount = 0,
  userImage,
  onPressNotifications,
  onPressProfile,
  theme = 'light',
  syncStatus = 'online', // This prop can stay if you show status in the topbar
  
  // --- ADDED ---
  onMenuPress, 
}) => {
  // --- REMOVED ---
  // const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  const isDark = theme === 'dark';

  const containerStyle = [
    styles.container,
    isDark ? styles.containerDark : styles.containerLight,
    { paddingTop: statusBarHeight },
  ];

  const iconColor = isDark ? '#B3E5FC' : '#0D47A1'; 

  // --- REMOVED ---
  // All menu handlers (handleMenuPress, handleCloseMenu, handleLogout) are gone
  
  return (
    <View style={containerStyle}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={'transparent'}
        translucent={true}
      />

      {/* --- Main Bar Content (Icons and Title) --- */}
      <View style={styles.contentWrapper}>
        {/* --- Left Section (Menu + Brand/Logo) --- */}
        <View style={styles.leftSection}>
          {/* Hamburger Menu Icon (UPDATED) */}
          <TouchableOpacity
            onPress={onMenuPress} // <-- USE THE PROP HERE
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="menu" size={26} color={iconColor} />
          </TouchableOpacity>

          {/* Brand/Logo: SmartAttendance */}
          <View style={styles.brandContainer}>
            <Icon
              name="school"
              size={22}
              color={isDark ? '#4FC3F7' : '#1565C0'}
            />
            <Text style={[styles.brandText, isDark ? styles.textDark : styles.textLight]}>
              SmartAttendance
            </Text>
          </View>
        </View>

        {/* --- Right Section (Notifications + Profile) --- */}
        <View style={styles.rightSection}>
          {/* Notification Icon + Badge */}
          <TouchableOpacity
            onPress={onPressNotifications}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <View style={styles.notificationWrapper}>
              <Icon name="notifications-none" size={24} color={iconColor} />
              {notificationCount > 0 && (
                <Animated.View style={[styles.badge]}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </Animated.View>
              )}
            </View>
          </TouchableOpacity>

          {/* Profile Avatar/Icon */}
          <TouchableOpacity onPress={onPressProfile} style={styles.avatarTouchable}>
            <View style={[styles.avatarContainer, isDark && styles.avatarContainerDark]}>
              {userImage ? (
                <Image source={{ uri: userImage }} style={styles.avatar} />
              ) : (
                <Icon name="person" size={20} color={isDark ? '#FFF' : '#0D47A1'} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- HAMBURGER MENU COMPONENT (REMOVED) --- */}
      {/* The menu is no longer rendered here */}
      
    </View>
  );
};

// --- Styles (Unchanged from your provided code) ---
const styles = StyleSheet.create({
  container: {
    flexDirection: 'column', 
    justifyContent: 'flex-start', 
    paddingHorizontal: 0, 
    borderBottomWidth: 0, 
    elevation: 4, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, 
    shadowRadius: 3,
    zIndex: 10, 
  },
  contentWrapper: {
    height: 55, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0,0,0,0.1)', 
  },
  containerDark: {
    backgroundColor: '#1E3A8A', 
    shadowColor: 'rgba(255,255,255,0.1)', 
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, 
    marginRight: 8, 
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12, 
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800', 
    marginLeft: 8,
    letterSpacing: -0.5, 
  },
  textLight: {
    color: '#1F2937', 
  },
  textDark: {
    color: '#E0F7FA', 
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', 
  },
  iconButton: {
    padding: 8, 
    borderRadius: 20, 
    marginLeft: 4, 
  },
  notificationWrapper: {
    position: 'relative', 
  },
  badge: {
    position: 'absolute',
    top: -5, 
    right: -6,
    backgroundColor: '#FF3B30', 
    borderRadius: 9, 
    minWidth: 18, 
    height: 18,
    paddingHorizontal: 5, 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5, 
    borderColor: '#FFFFFF', 
  },
  badgeText: {
    color: '#FFFFFF', 
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatarTouchable: {
    marginLeft: 12, 
    borderRadius: 18, 
    padding: 2, 
    borderWidth: 1,
    borderColor: 'transparent', 
  },
  avatarContainer: {
    width: 36, 
    height: 36,
    borderRadius: 18, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CFD8DC', 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: '#E0E0E0', 
  },
  avatarContainerDark: {
    backgroundColor: '#455A64', 
    borderColor: '#78909C', 
  },
  avatar: {
    width: '100%', 
    height: '100%',
  },
});

export default Topbar;