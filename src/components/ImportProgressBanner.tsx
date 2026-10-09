// src/components/ImportProgressBanner.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useImportProgress } from '../hooks/useImportProgress';
import { dismissImportProgress, ImportProgressJob } from '../services/importProgressBus';

// Shown at the top of the Exposure tab. While a batch is running it stays up
// (non-dismissable) so the user knows the upload is still being processed
// even after closing the import modal; once every file has come back it
// switches to a summary — including each failed file's reason (e.g. too
// large, server busy/failed) — that stays until the user dismisses it.
const JobBanner: React.FC<{ job: ImportProgressJob }> = ({ job }) => {
  const failed = job.failures.length;
  const succeeded = job.completed - failed;
  const tone = !job.finished ? 'processing' : failed > 0 ? 'error' : 'success';

  return (
    <View style={[styles.banner, styles[tone]]}>
      <View style={styles.titleRow}>
        {tone === 'processing' && <ActivityIndicator size="small" color="#8B5CF6" />}
        {tone === 'success' && <CheckCircle2 size={16} color="#1E8E3E" />}
        {tone === 'error' && <AlertTriangle size={16} color="#D9534F" />}
        <Text style={styles.title} numberOfLines={2}>
          {!job.finished
            ? `Processing ${job.total} file${job.total === 1 ? '' : 's'} for ${job.targetLabel} — ${job.completed} of ${job.total} done`
            : failed === 0
              ? `${job.targetLabel}: all ${job.total} file${job.total === 1 ? '' : 's'} processed`
              : `${job.targetLabel}: ${succeeded} of ${job.total} processed, ${failed} failed`}
        </Text>
        {job.finished && (
          <TouchableOpacity onPress={() => dismissImportProgress(job.jobId)} hitSlop={10}>
            <X size={16} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
      {!job.finished && (
        <Text style={styles.subtext}>
          This can take a few minutes — you can keep using the app.
        </Text>
      )}
      {job.failures.map((failure, i) => (
        <Text key={`${failure.fileName}-${i}`} style={styles.failureText}>
          • {failure.fileName}: {failure.error}
        </Text>
      ))}
    </View>
  );
};

const ImportProgressBanner: React.FC = () => {
  const jobs = useImportProgress();
  if (jobs.length === 0) return null;
  return (
    <>
      {jobs.map(job => (
        <JobBanner key={job.jobId} job={job} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  processing: { backgroundColor: '#F0EBFF' },
  success: { backgroundColor: '#E6F4EA' },
  error: { backgroundColor: '#FDECEA' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  subtext: { fontSize: 12, color: '#5B5B5E', marginTop: 4 },
  failureText: { fontSize: 12, color: '#D9534F', marginTop: 4, lineHeight: 16 },
});

export default ImportProgressBanner;
