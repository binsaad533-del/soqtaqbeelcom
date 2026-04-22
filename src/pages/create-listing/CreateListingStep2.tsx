import type { CreateListingSharedState } from "./sharedState";
import CreateListingStep2Legacy from "./CreateListingStep2Legacy";
import CreateListingStep2Unified from "./CreateListingStep2Unified";

interface Props {
  state: CreateListingSharedState;
}

/**
 * CreateListingStep2 — Router component
 * 
 * Routes to either:
 * - CreateListingStep2Legacy: for existing listings (uses_unified_upload = false)
 *   Preserves exact behavior for the 77 existing listings (38 drafts).
 * - CreateListingStep2Unified: for new listings (uses_unified_upload = true)
 *   Single dropzone + AI classification + review dialog.
 */
const CreateListingStep2 = ({ state }: Props) => {
  if (state.usesUnifiedUpload) {
    return <CreateListingStep2Unified state={state} />;
  }
  return <CreateListingStep2Legacy state={state} />;
};

export default CreateListingStep2;
