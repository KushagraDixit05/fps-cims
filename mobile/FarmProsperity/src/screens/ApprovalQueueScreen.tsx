import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getApprovalQueue, approveEntry, rejectEntry, requestRevision,
  ApprovalInstance,
} from '../api/approvals';
import { colors } from '../utils/colors';

const STATUS_COLOR: Record<string, string> = {
  submitted: '#F59E0B',
  under_review: '#3B82F6',
  resubmitted: '#8B5CF6',
  escalated: '#EF4444',
  approved: '#10B981',
  rejected: '#EF4444',
};

export default function ApprovalQueueScreen() {
  const [queue, setQueue] = useState<ApprovalInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getApprovalQueue();
      setQueue(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load approval queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    try {
      await approveEntry(id, 'Approved via mobile app.');
      load();
    } catch {
      Alert.alert('Error', 'Failed to approve.');
    }
  };

  const handleReject = (id: string) => {
    Alert.prompt(
      'Reject Entry',
      'Provide rejection reason:',
      async (reason) => {
        if (!reason?.trim()) return;
        try {
          await rejectEntry(id, reason);
          load();
        } catch {
          Alert.alert('Error', 'Failed to reject.');
        }
      },
      'plain-text',
    );
  };

  const handleRequestRevision = (id: string) => {
    Alert.prompt(
      'Request Revision',
      'Describe the required changes:',
      async (note) => {
        if (!note?.trim()) return;
        try {
          await requestRevision(id, note);
          load();
        } catch {
          Alert.alert('Error', 'Failed to request revision.');
        }
      },
      'plain-text',
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Approval Queue</Text>
      {queue.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No pending approvals.</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.module}>{item.workflow_name}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] ?? '#6B7280' }]}>
                  <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.submitter}>By: {item.submitted_by_username}</Text>
              <Text style={styles.date}>{new Date(item.submitted_at).toLocaleDateString()}</Text>
              {item.revision_count > 0 && (
                <Text style={styles.revisions}>Revisions: {item.revision_count}</Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.reviseBtn]} onPress={() => handleRequestRevision(item.id)}>
                  <Text style={styles.btnText}>Revise</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 20, fontWeight: '700', color: '#111827', padding: 16 },
  empty: { fontSize: 15, color: '#6B7280' },
  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  module: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600', textTransform: 'capitalize' },
  submitter: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  date: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  revisions: { fontSize: 12, color: '#F59E0B', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: '#10B981' },
  reviseBtn: { backgroundColor: '#F59E0B' },
  rejectBtn: { backgroundColor: '#EF4444' },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
