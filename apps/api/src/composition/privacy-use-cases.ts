import { DeleteAccountUseCase, ExportPersonalDataUseCase } from "@tfm-bic/application";

import type { AuthDependencies } from "./auth-dependencies.js";
import type { PrivacyDependencies } from "./privacy-dependencies.js";

export interface PrivacyUseCases {
  exportPersonalData: ExportPersonalDataUseCase;
  deleteAccount: DeleteAccountUseCase;
}

/**
 * Composition-root wiring only. Deletion reuses Identity's user repository and password hasher
 * (M3) to re-check the password — there is no second authentication path.
 */
export function createPrivacyUseCases(
  deps: PrivacyDependencies,
  authDeps: AuthDependencies,
): PrivacyUseCases {
  return {
    exportPersonalData: new ExportPersonalDataUseCase(deps.readModel, authDeps.clock),
    deleteAccount: new DeleteAccountUseCase(
      authDeps.userRepository,
      authDeps.passwordHasher,
      deps.erasureStore,
    ),
  };
}
