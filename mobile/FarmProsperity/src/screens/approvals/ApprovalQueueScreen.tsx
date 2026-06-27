/**
 * ApprovalQueueScreen — checker approval queue (Phase 6).
 *
 * Shows submissions pending the authenticated user's review.  Accessible to
 * users with any of: can_approve_crop_visit, can_approve_mandi_arrival,
 * can_approve_product_demo.
 *
 * Features:
 *  - Two tabs: Queue (pending) and History (completed)
 *  - Per-item actions: Start Review / Approve / Reject / Request Revision
 *  - Comment modal for reject and revision actions
 *  - Pull-to-refresh
 *  - Empty state with illustration
 *  - Approval status badges with color coding
 *  - Module labels (Crop / Market / Product)
 *  - SLA hours display for overdue items
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput,
  Alert, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  getApprovalQueue, getApprovalHistory,
  startReview, approveSubmission, rejectSubmission, requestRevision,
  type ApprovalItem, type ApprovalStatus,
} from '../../api/approvals';
import { usePermissions } from '../../hooks/usePermissions';
import AppIcon from '../../components/AppIcon';
import {
  ClipboardList, Check, XCircle, MessageSquare,
  AlertTriangle,
} from '../../utils/icons';

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; bg: string; color: string }> = {
  submitted:          { label: 'Submitted',     bg: '#EEF2FF', color: '#4F46E5' },
  under_review:       { label: 'In Review',     bg: '#FEF3DA', color: '#C8900A' },
  revision_requested: { label: 'Needs Revision',bg: '#FFF3CD', color: '#856404' },
  escalated:          { label: 'Escalated',     bg: '#FEE2E2', color: '#DC2626' },
  resubmitted:        { label: 'Resubmitted',   bg: '#D1FAE5', color: '#065F46' },
  approved:           { label: 'Approved',      bg: '#D1FAE5', color: '#065F46' },
  rejected:           { label: 'Rejected',      bg: '#FEE2E2', color: '#DC2626' },
};

const MODULE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  crop_monitoring: { label: 'Crop',    color: '#1A4A2E', bg: '#E1F2E8' },
  mandi:           { label: 'Market',  color: '#C8900A', bg: '#FEF3DA' },
  product_demo:    { label: 'Product', color: '#0277BD', bg: '#E8F4FD' },
};

// ─── Comment Modal ────────────────────────────────────────────────────────────

interface CommentModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
  submitting: boolean;
}

const CommentModal = ({ visible, title, placeholder, onConfirm, onCancel, submitting }: CommentModalProps) => {
  const [text, setText] = useState('');

  const handleConfirm = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Comment required', 'Please enter a comment before submitting.');
      return;
    }
    onConfirm(trimmed);
    setText('');
  };

  const handleCancel = () => {
    setText('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>{title}</Text>
          <TextInput
            style={modalStyles.input}
            placeholder={placeholder}
            placeholderTextColor="#8A8A7A"
            multiline
            numberOfLines={4}
            value={text}
            onChangeText={setText}
            editable={!submitting}
            autoFocus
          />
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={handleCancel} disabled={submitting}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.confirmBtn} onPress={handleConfirm} disabled={submitting}>
              {submitting
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={modalStyles.confirmText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  title: { fontSize: 17, fontWeight: '700', color: '#1A3A25', marginBottom: 14 },
  input: {
    borderWidth: 1, borderColor: '#E0DDD5', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1A3A25', minHeight: 96,
    textAlignVertical: 'top', backgroundColor: '#FAFAF8',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0DDD5', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6A7A6A' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#1A4A2E', alignItems: 'center' },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

// ─── Approval Card ────────────────────────────────────────────────────────────

interface ApprovalCardProps {
  item: ApprovalItem;
  onStartReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRevision: () => void;
  canApproveModule: boolean;
  loading: boolean;
}

const ApprovalCard = ({
  item, onStartReview, onApprove, onReject, onRevision, canApproveModule, loading,
}: ApprovalCardProps) => {
  const statusCfg = STATUS_CONFIG[item.status] ?? { label: item.status, bg: '#F3F4F6', color: '#374151' };
  const moduleCfg = MODULE_LABELS[item.module] ?? { label: item.module, color: '#374151', bg: '#F3F4F6' };
  const isOverdue = item.sla_hours !== undefined && item.sla_hours > 48;

  return (
    <View style={card.root}>
      {/* ── Header row ── */}
      <View style={card.header}>
        <View style={[card.moduleBadge, { backgroundColor: moduleCfg.bg }]}>
          <Text style={[card.moduleText, { color: moduleCfg.color }]}>{moduleCfg.label}</Text>
        </View>
        <View style={[card.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[card.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
        {isOverdue && (
          <View style={card.overdueBadge}>
            <AppIcon icon={AlertTriangle} size={10} color="#DC2626" strokeWidth={2} />
            <Text style={card.overdueText}> {item.sla_hours}h</Text>
          </View>
        )}
      </View>

      {/* ── Object description ── */}
      <Text style={card.repr} numberOfLines={2}>{item.object_repr}</Text>
      <Text style={card.meta}>
        By {item.submitted_by_name}
        {item.current_approver_name ? `  ·  Reviewer: ${item.current_approver_name}` : ''}
      </Text>
      <Text style={card.date}>
        {new Date(item.submitted_at).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </Text>

      {/* ── Revision comment snippet ── */}
      {item.last_comment && (item.status === 'revision_requested' || item.status === 'rejected') ? (
        <View style={card.commentRow}>
          <AppIcon icon={MessageSquare} size={12} color="#8A8A7A" strokeWidth={2} />
          <Text style={card.commentText} numberOfLines={2}> {item.last_comment}</Text>
        </View>
      ) : null}

      {/* ── Actions — shown only to users with approve permission for this module ── */}
      {canApproveModule ? (
        <>
          {/* Claim the submission when it is queued (submitted / resubmitted / escalated) */}
          {(item.status === 'submitted' || item.status === 'resubmitted' || item.status === 'escalated') && (
            <View style={card.actions}>
              <TouchableOpacity style={card.reviewBtn} onPress={onStartReview} disabled={loading}>
                <Text style={card.reviewBtnText}>Start Review</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Approve / Request Revision / Reject while actively reviewing */}
          {item.status === 'under_review' && (
            <View style={card.actions}>
              <TouchableOpacity style={card.approveBtn} onPress={onApprove} disabled={loading}>
                <AppIcon icon={Check} size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={card.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={card.revisionBtn} onPress={onRevision} disabled={loading}>
                <AppIcon icon={MessageSquare} size={14} color="#C8900A" strokeWidth={2} />
                <Text style={card.revisionBtnText}>Revise</Text>
              </TouchableOpacity>
              <TouchableOpacity style={card.rejectBtn} onPress={onReject} disabled={loading}>
                <AppIcon icon={XCircle} size={14} color="#DC2626" strokeWidth={2} />
                <Text style={card.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
};

const card = StyleSheet.create({
  root: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginHorizontal: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: '#E0DDD5',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  moduleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  moduleText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  overdueBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  overdueText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  repr: { fontSize: 15, fontWeight: '700', color: '#1A3A25', marginBottom: 4 },
  meta: { fontSize: 12, color: '#6A7A6A', marginBottom: 2 },
  date: { fontSize: 11, color: '#8A8A7A', marginBottom: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8F6F1', borderRadius: 8, padding: 8, marginBottom: 10 },
  commentText: { flex: 1, fontSize: 12, color: '#6A7A6A', fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reviewBtn: { flex: 1, backgroundColor: '#EEF2FF', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reviewBtnText: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },
  approveBtn: { flex: 1, backgroundColor: '#1A4A2E', borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  approveBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  revisionBtn: { flex: 1, backgroundColor: '#FEF3DA', borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  revisionBtnText: { fontSize: 13, fontWeight: '600', color: '#C8900A' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ActiveTab = 'queue' | 'history';

export default function ApprovalQueueScreen() {
  const { can } = usePermissions();

  const [activeTab, setActiveTab]     = useState<ActiveTab>('queue');
  const [queueItems, setQueueItems]   = useState<ApprovalItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);  // item id

  // Comment modal state
  const [modal, setModal] = useState<{
    visible: boolean;
    type: 'reject' | 'revision';
    itemId: string;
  }>({ visible: false, type: 'reject', itemId: '' });
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [q, h] = await Promise.all([getApprovalQueue(), getApprovalHistory()]);
      setQueueItems(q.results);
      setHistoryItems(h.results);
    } catch {
      // Network unavailable — keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleStartReview = async (id: string) => {
    setActionLoading(id);
    try {
      await startReview(id);
      await loadData();
    } catch {
      Alert.alert('Error', 'Could not start review. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (id: string) => {
    Alert.alert('Approve Submission', 'Are you sure you want to approve this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        style: 'default',
        onPress: async () => {
          setActionLoading(id);
          try {
            await approveSubmission(id);
            await loadData();
          } catch {
            Alert.alert('Error', 'Could not approve submission. Please try again.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleReject = (id: string) => {
    setModal({ visible: true, type: 'reject', itemId: id });
  };

  const handleRevision = (id: string) => {
    setModal({ visible: true, type: 'revision', itemId: id });
  };

  const handleModalConfirm = async (comment: string) => {
    setModalSubmitting(true);
    try {
      if (modal.type === 'reject') {
        await rejectSubmission(modal.itemId, comment);
      } else {
        await requestRevision(modal.itemId, comment);
      }
      setModal({ visible: false, type: 'reject', itemId: '' });
      await loadData();
    } catch {
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleModalCancel = () => {
    setModal({ visible: false, type: 'reject', itemId: '' });
  };

  const canApproveForModule = (item: ApprovalItem): boolean => {
    const permMap: Record<string, string> = {
      crop_monitoring: 'can_approve_crop_visit',
      mandi:           'can_approve_mandi_arrival',
      product_demo:    'can_approve_product_demo',
    };
    return can(permMap[item.module] ?? '');
  };

  const displayItems = activeTab === 'queue' ? queueItems : historyItems;

  const renderEmpty = () => (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <AppIcon icon={ClipboardList} size={48} color="#8A8A7A" strokeWidth={1.5} />
      </View>
      <Text style={s.emptyTitle}>
        {activeTab === 'queue' ? 'Queue is clear' : 'No history yet'}
      </Text>
      <Text style={s.emptySubtitle}>
        {activeTab === 'queue'
          ? 'No pending submissions to review.'
          : 'Completed approvals will appear here.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <AppIcon icon={ClipboardList} size={22} color="#FFFFFF" strokeWidth={2} />
        <Text style={s.headerTitle}>Approval Queue</Text>
        {queueItems.length > 0 ? (
          <View style={s.countBadge}>
            <Text style={s.countText}>{queueItems.length}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'queue' && s.tabActive]}
          onPress={() => setActiveTab('queue')}
        >
          <Text style={[s.tabText, activeTab === 'queue' && s.tabTextActive]}>
            Pending {queueItems.length > 0 ? `(${queueItems.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'history' && s.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[s.tabText, activeTab === 'history' && s.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color="#1A4A2E" /></View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ApprovalCard
              item={item}
              onStartReview={() => handleStartReview(item.id)}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onRevision={() => handleRevision(item.id)}
              canApproveModule={canApproveForModule(item)}
              loading={actionLoading === item.id}
            />
          )}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A4A2E" />
          }
          contentContainerStyle={displayItems.length === 0 ? s.emptyContainer : { paddingTop: 12, paddingBottom: 32 }}
        />
      )}

      {/* ── Comment Modal ── */}
      <CommentModal
        visible={modal.visible}
        title={modal.type === 'reject' ? 'Reject Submission' : 'Request Revision'}
        placeholder={
          modal.type === 'reject'
            ? 'Explain why this entry is being rejected…'
            : 'Describe what needs to be corrected…'
        }
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        submitting={modalSubmitting}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F6F1' },

  header: {
    backgroundColor: '#1A4A2E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', flex: 1 },
  countBadge: {
    backgroundColor: '#E1F2E8', borderRadius: 99, minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  countText: { color: '#1A4A2E', fontSize: 12, fontWeight: '800' },

  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0DDD5' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1A4A2E' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6A7A6A' },
  tabTextActive: { color: '#1A4A2E', fontWeight: '700' },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center' },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { opacity: 0.4, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A3A25', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#6A7A6A', textAlign: 'center', lineHeight: 20 },
});
