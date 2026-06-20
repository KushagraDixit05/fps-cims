// src/utils/futureDateWarning.ts
// Shared utility for handling future date selection across all module wizards.
// Shows a confirmation Alert when the user picks a date in the future.

import { Alert } from 'react-native';

/**
 * If `selectedDate` is in the future, shows a confirmation Alert.
 * - On "Continue" → calls `onConfirm()` (accept the date).
 * - On "Cancel"   → calls `onCancel()` (revert to previous value).
 *
 * If the date is today or in the past, `onConfirm()` is called immediately.
 */
export const showFutureDateWarning = (
  selectedDate: Date,
  onConfirm: () => void,
  onCancel: () => void,
) => {
  // Strip time component for a clean date-only comparison
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (selectedDate > today) {
    Alert.alert(
      'Future Date Selected',
      'You have selected a future date. Please confirm that this entry represents planned or anticipated information.',
      [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Continue', onPress: onConfirm },
      ],
    );
  } else {
    onConfirm();
  }
};
