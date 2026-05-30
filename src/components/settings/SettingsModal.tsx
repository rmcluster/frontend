import { Dialog, DialogContent } from '../ui/Dialog';
import { ClusterTuningSection } from './ClusterTuningSection';
import { SettingsDialogHeader } from './SettingsDialogHeader';
import { ErrorState, LoadingState } from './SettingsStates';
import { useSettingsState } from './useSettingsState';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    nodeCount,
    chunkSizeAvailable,
    draft,
    loading,
    savePending,
    loadError,
    saveError,
    chunkSizeHint,
    updateDraft,
  } = useSettingsState(open);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent maxWidth="max-w-2xl">
        <SettingsDialogHeader onClose={onClose} />

        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : (
          <ClusterTuningSection
            nodeCount={nodeCount}
            chunkSizeAvailable={chunkSizeAvailable}
            draft={draft}
            chunkSizeHint={chunkSizeHint}
            savePending={savePending}
            saveError={saveError}
            onChange={updateDraft}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
