// src/components/CropCard.tsx
// Single collapsible crop card used in Step 2 of the Crop Monitoring wizard.
// Labeled "Crop Details - N". Has a delete icon in the top-right (except when onDelete is undefined).

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { colors } from '../utils/colors';
import Card from './Card';
import FormInput from './FormInput';
import ConditionSelector from './ConditionSelector';
import ProblemCheckboxGroup from './ProblemCheckboxGroup';
import SmartDropdown from './SmartDropdown';
import { OTHERS_VALUE } from '../utils/othersValidation';

import type {
  CropRecordDraft,
  CropRecordErrors,
  VarietyDraft,
  CropMaster,
  CropStage,
  CropCondition,
  ProblemType,
} from '../types/cropMonitoring';

// ── Stage dropdown options ────────────────────────────────────────────────────

const STAGE_OPTIONS: { value: CropStage; label: string }[] = [
  { value: 'seedling',    label: 'Seedling' },
  { value: 'vegetative',  label: 'Vegetative' },
  { value: 'flowering',   label: 'Flowering' },
  { value: 'fruiting',    label: 'Fruiting' },
  { value: 'harvesting',  label: 'Harvesting' },
  { value: 'post_harvest', label: 'Post Harvest' },
];

// ── Simple inline dropdown (no native library needed) ────────────────────────

interface SimpleSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

const SimpleSelect = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select...',
  disabled = false,
  error,
  required = false,
}: SimpleSelectProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={selectStyles.wrapper}>
      <Text style={selectStyles.label}>
        {label}
        {required && <Text style={selectStyles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[
          selectStyles.trigger,
          error ? selectStyles.triggerError : null,
          disabled && selectStyles.triggerDisabled,
        ]}
        onPress={() => !disabled && setOpen((prev) => !prev)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            selectStyles.triggerText,
            !selected && selectStyles.placeholder,
          ]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={selectStyles.arrow}>{open ? '‹' : '›'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={selectStyles.dropdown}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                selectStyles.option,
                opt.value === value && selectStyles.optionSelected,
              ]}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  selectStyles.optionText,
                  opt.value === value && selectStyles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error ? <Text style={selectStyles.errorText}>{error}</Text> : null}
    </View>
  );
};

const selectStyles = StyleSheet.create({
  wrapper:           { marginBottom: 14 },
  label:             { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 6 },
  required:          { color: colors.error },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    backgroundColor: colors.surface,
  },
  triggerError:      { borderColor: colors.error },
  triggerDisabled:   { backgroundColor: colors.background, opacity: 0.6 },
  triggerText:       { fontSize: 14, color: colors.textPrimary, flex: 1 },
  placeholder:       { color: colors.textMuted },
  arrow:             { fontSize: 16, color: colors.textMuted, marginLeft: 6, fontWeight: '600' },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginTop: 2,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 100,
  },
  option:            { paddingVertical: 11, paddingHorizontal: 14 },
  optionSelected:    { backgroundColor: colors.primaryLight },
  optionText:        { fontSize: 14, color: colors.textPrimary },
  optionTextSelected:{ color: colors.primary, fontWeight: '600' },
  errorText:         { marginTop: 4, fontSize: 12, color: colors.error },
});

// ── CropCard ─────────────────────────────────────────────────────────────────

interface CropCardProps {
  /** 1-based index for "Crop Details - 1" label */
  index: number;
  data: CropRecordDraft;
  cropMaster: CropMaster[];
  onChange: (data: Partial<CropRecordDraft>) => void;
  /** Undefined for the first card — hides the delete button */
  onDelete?: () => void;
  errors: CropRecordErrors;
}

const CropCard = ({
  index,
  data,
  cropMaster,
  onChange,
  onDelete,
  errors,
}: CropCardProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isPickerOpenRef = React.useRef(false);

  // Sync ref with state
  React.useEffect(() => {
    isPickerOpenRef.current = showDatePicker;
  }, [showDatePicker]);

  // Force-close the date picker when validation errors appear (user pressed NEXT)
  // This prevents the native picker from being open during component unmount.
  React.useEffect(() => {
    if (Object.keys(errors).length > 0 && showDatePicker) {
      setShowDatePicker(false);
    }
  }, [errors, showDatePicker]);

  // Cleanup: ensure date picker is closed when component unmounts
  // Build crop options from master data
  const cropOptions = cropMaster.map((c) => ({ value: c.crop_name, label: c.crop_name }));

  // Build variety options filtered by the selected crop — SmartDropdown appends 'Others' automatically.
  // When crop is Others (or not yet selected), selectedCropMaster is undefined → varietyOptions is empty
  // → SmartDropdown's Case B auto-select triggers → variety becomes OTHERS_VALUE automatically.
  const selectedCropMaster = cropMaster.find((c) => c.crop_name === data.crop_name);
  const varietyOptions = (selectedCropMaster?.varieties ?? []).map((v) => ({
    value: v.variety_name,
    label: v.variety_name,
  }));

  const handleCropChange = (cropName: string) => {
    // When Others selected: keep varieties so SmartDropdown auto-selects Others for variety
    onChange({ crop_name: cropName, custom_crop_name: '', varieties: [{ variety: '', custom_variety: '' }] });
  };

  const handleCropCustomChange = (text: string) => {
    onChange({ custom_crop_name: text });
  };

  const handleVarietyChange = (idx: number, patch: Partial<VarietyDraft>) => {
    const updated = (data.varieties ?? []).map((v, i) => i === idx ? { ...v, ...patch } : v);
    onChange({ varieties: updated });
  };

  const addVariety = () => {
    onChange({ varieties: [...(data.varieties ?? []), { variety: '', custom_variety: '' }] });
  };

  const removeVariety = (idx: number) => {
    const updated = (data.varieties ?? []).filter((_, i) => i !== idx);
    onChange({ varieties: updated });
  };

  // ── Date helpers ────────────────────────────────────────────────────────────

  /**
   * Guards against Invalid Date objects.
   * On Hermes/New Architecture, passing NaN-based dates to native bridge
   * causes a hard JNI crash — this prevents that entirely.
   */
  const isValidDate = (d: Date): boolean =>
    d instanceof Date && !isNaN(d.getTime());

  /**
   * Parse a YYYY-MM-DD string safely in local time (not UTC).
   * new Date("2024-05-15") → UTC midnight → wrong day in IST (+05:30).
   * new Date("2024-05-15T12:00:00") → local noon → always the correct day.
   * Returns null if the string is empty or produces an invalid Date.
   */
  const parseSowingDate = (s: string): Date | null => {
    if (!s || !s.trim()) return null;
    try {
      const d = new Date(s.trim() + 'T12:00:00');
      return isValidDate(d) ? d : null;
    } catch {
      return null;
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    // Always hide the picker on Android regardless of outcome
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    // Bug fix #2: Guard against 'dismissed' action.
    // On some OEM Android builds (e.g. OxygenOS), dismissing the picker
    // fires onChange with type='dismissed' but a truthy 'date' object.
    // Honour the dismissal — don't update state.
    if (event.type === 'dismissed') {
      return;
    }

    if (!date) {
      return;
    }

    // Guard against Invalid Date before calling toISOString().
    // toISOString() throws RangeError on Invalid Date — uncaught it crashes Hermes.
    if (!isValidDate(date)) {
      return;
    }

    try {
      const iso = date.toISOString().split('T')[0]; // "YYYY-MM-DD"
      onChange({ date_of_sowing: iso });
    } catch {
      // date formatting failed — ignore silently
    }
  };

  const parsedSowingDate = parseSowingDate(data.date_of_sowing);

  const sowingDateDisplay = parsedSowingDate
    ? parsedSowingDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Select date';

  // Bug fix #1: datePickerValue MUST always be a valid Date.
  // The native Android DatePicker bridge crashes the JNI layer if it receives
  // a Date whose .getTime() returns NaN (Hermes cannot serialize NaN as double).
  // Fallback to today if the stored value is empty or invalid.
  const datePickerValue: Date = parsedSowingDate ?? new Date();

  return (
    <Card style={styles.card}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => setCollapsed((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerTitle}>Crop Details - {index}</Text>
          <Text style={styles.collapseArrow}>{collapsed ? '+' : '-'}</Text>
        </TouchableOpacity>

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.trashIcon}>
              <View style={styles.trashLid} />
              <View style={styles.trashBody}>
                <View style={styles.trashLine} />
                <View style={styles.trashLine} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Body (collapsible) ── */}
      {!collapsed && (
        <View style={styles.body}>
          {/* Crop dropdown — SmartDropdown allows "Others" for unlisted crops */}
          <SmartDropdown
            label="Crop"
            value={data.crop_name}
            customValue={data.custom_crop_name ?? ''}
            options={cropOptions}
            onSelect={handleCropChange}
            onCustomChange={handleCropCustomChange}
            placeholder="Select crop"
            required
            error={errors.crop_name}
            customError={errors.custom_crop_name}
          />

          {/* Varieties — multiple varieties supported per crop */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>
              Varieties <Text style={styles.required}>*</Text>
            </Text>
            {(data.varieties ?? []).map((v, idx) => {
              const varErr = errors.varietyErrors?.[idx];
              return (
                <View key={idx} style={styles.varietyRow}>
                  <View style={styles.varietyDropdown}>
                    <SmartDropdown
                      label=""
                      value={v.variety}
                      customValue={v.custom_variety}
                      options={varietyOptions}
                      onSelect={(val) => handleVarietyChange(idx, {
                        variety: val,
                        custom_variety: val !== OTHERS_VALUE ? '' : v.custom_variety,
                      })}
                      onCustomChange={(val) => handleVarietyChange(idx, { custom_variety: val })}
                      placeholder={data.crop_name ? 'Select variety' : 'Select crop first'}
                      disabled={!data.crop_name}
                      error={varErr}
                    />
                  </View>
                  {(data.varieties ?? []).length > 1 && (
                    <TouchableOpacity
                      style={styles.removeVarietyBtn}
                      onPress={() => removeVariety(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.removeVarietyText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            <TouchableOpacity style={styles.addVarietyBtn} onPress={addVariety} disabled={!data.crop_name}>
              <Text style={[styles.addVarietyText, !data.crop_name && styles.addVarietyDisabled]}>＋ Add Variety</Text>
            </TouchableOpacity>
          </View>

          {/* Date of Sowing */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>
              Date of Sowing <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.dateTrigger, errors.date_of_sowing ? styles.dateError : null]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.dateTriggerText,
                  !data.date_of_sowing && styles.datePlaceholder,
                ]}
              >
                {sowingDateDisplay}
              </Text>
            </TouchableOpacity>
            {errors.date_of_sowing ? (
              <Text style={styles.errorText}>{errors.date_of_sowing}</Text>
            ) : null}
          </View>

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={datePickerValue}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {showDatePicker && Platform.OS === 'ios' && (
            <DateTimePicker
              value={datePickerValue}
              mode="date"
              display="inline"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {/* Area fields — 2-column row */}
          <Text style={styles.fieldLabel}>
            Area Details (Acre)
          </Text>
          <View style={styles.areaRow}>
            <View style={styles.areaCol}>
              <Text style={styles.areaColLabel}>
                Current Area <Text style={styles.required}>*</Text>
              </Text>
              <FormInput
                label=""
                value={data.current_area_acre}
                onChangeText={(v) => onChange({ current_area_acre: v })}
                keyboardType="decimal-pad"
                placeholder="Enter area"
                error={errors.current_area_acre}
                style={styles.areaInput}
              />
            </View>
            <View style={styles.areaCol}>
              <Text style={styles.areaColLabel}>Last Year Area</Text>
              <FormInput
                label=""
                value={data.last_year_area_acre}
                onChangeText={(v) => onChange({ last_year_area_acre: v })}
                keyboardType="decimal-pad"
                placeholder="Last year area"
                error={errors.last_year_area_acre}
                style={styles.areaInput}
              />
            </View>
          </View>

          {/* Crop Stage dropdown */}
          <SimpleSelect
            label="Crop Stage"
            value={data.crop_stage}
            options={STAGE_OPTIONS}
            onSelect={(v) => onChange({ crop_stage: v as CropStage })}
            placeholder="Select crop stage"
            required
            error={errors.crop_stage}
          />

          {/* Condition pill group */}
          <ConditionSelector
            value={data.crop_condition}
            onChange={(v: CropCondition) => onChange({ crop_condition: v })}
            error={errors.crop_condition}
          />

          {/* Problems checkboxes */}
          <ProblemCheckboxGroup
            selected={data.problems}
            onChange={(probs: ProblemType[]) => onChange({ problems: probs })}
            otherDetail={data.other_problem_detail}
            onOtherDetailChange={(text) => onChange({ other_problem_detail: text })}
            error={errors.problems}
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  collapseArrow: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 12,
  },
  trashIcon: {
    width: 20,
    height: 22,
    alignItems: 'center',
  },
  trashLid: {
    width: 18,
    height: 3,
    backgroundColor: colors.textMuted,
    borderRadius: 1,
    marginBottom: 1,
  },
  trashBody: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingTop: 2,
  },
  trashLine: {
    width: 1.5,
    height: 8,
    backgroundColor: colors.textMuted,
    borderRadius: 1,
  },
  body: {
    padding: 14,
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  dateTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    backgroundColor: colors.surface,
  },
  dateError: {
    borderColor: colors.error,
  },
  dateTriggerText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  datePlaceholder: {
    color: colors.textMuted,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
  // ── 2-column area row ──
  areaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  areaCol: {
    flex: 1,
  },
  areaColLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  areaInput: {
    padding: 10,
    fontSize: 13,
  },
  // ── Multi-variety ──
  varietyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  varietyDropdown: {
    flex: 1,
  },
  removeVarietyBtn: {
    marginTop: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeVarietyText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '700',
  },
  addVarietyBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addVarietyText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  addVarietyDisabled: {
    color: colors.textMuted,
    borderColor: colors.textMuted,
  } as any,
});

export default CropCard;
