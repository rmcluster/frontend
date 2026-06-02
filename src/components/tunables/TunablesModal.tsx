import { Dialog, DialogContent } from '../ui/Dialog';
import { TunablesHeader } from './TunablesHeader';
import { ErrorState, LoadingState } from './TunablesStates';
import { TunablesPanel } from './TunablesPanel';
import { useTunablesState } from './useTunablesState';

type TunablesModalProps = {
  open: boolean;
  onClose: () => void;
};

export function TunablesModal({ open, onClose }: TunablesModalProps) {
  const {
    sections,
    draft,
    loading,
    savePending,
    loadError,
    saveError,
    updateTunable,
  } = useTunablesState(open);

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
        <TunablesHeader onClose={onClose} />

        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : (
          <TunablesPanel
            sections={sections}
            draft={draft}
            savePending={savePending}
            saveError={saveError}
            onTunableChange={updateTunable}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
