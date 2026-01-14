// src/components/AnimatedCheckmark.tsx

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    runOnJS, // JS thread par function run karne ke liye
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Ya jo icon set tum use kar rahe ho

// Props define karo
interface AnimatedCheckmarkProps {
    start: boolean; // Animation ko trigger karne ke liye
    onAnimationFinish: () => void; // Animation poori hone par call hoga
}

const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({ start, onAnimationFinish }) => {
    
    // 1. Animation values (Shared Values)
    const circleScale = useSharedValue(0); // Circle 0 se 1 tak scale hoga
    const iconScale = useSharedValue(0);   // Icon 0 se 1 tak scale hoga

    // 2. Animated Styles
    // Circle ke liye style
    const animatedCircleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: circleScale.value }],
        };
    });

    // Icon ke liye style
    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: iconScale.value }],
        };
    });

    // 3. Animation Trigger
    useEffect(() => {
        if (start) {
            // 1. Pehle Circle ko 'Spring' effect se bada karo
            circleScale.value = withSpring(1, {
                damping: 15,
                stiffness: 100,
            });

            // 2. Thodi der (200ms) baad Icon ko dikhao
            iconScale.value = withDelay(
                200, 
                withSpring(1, { damping: 12, stiffness: 100 }, (isFinished) => {
                    // Jab icon ki animation poori ho jaaye
                    if (isFinished) {
                        // Animation thread se JS thread par 'onAnimationFinish' ko call karo
                        runOnJS(onAnimationFinish)();
                    }
                })
            );
        }
    }, [start]); // Yeh tabhi chalega jab 'start' prop true hoga

    // 4. Render
    return (
        <Animated.View style={[styles.circle, animatedCircleStyle]}>
            <Animated.View style={animatedIconStyle}>
                <Icon name="check" size={80} color="#FFFFFF" />
            </Animated.View>
        </Animated.View>
    );
};

// Styles
const styles = StyleSheet.create({
    circle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#4CAF50', // Success green
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
});

export default AnimatedCheckmark;