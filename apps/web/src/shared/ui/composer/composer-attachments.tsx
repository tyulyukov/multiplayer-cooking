import type { FC } from "react";
import styles from "@/shared/ui/composer/composer.module.scss";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentGroup,
  AttachmentMedia,
} from "@/shared/ui/attachment";

import type { ComposerProps } from "./types";
export const ComposerAttachments: FC<
  Pick<ComposerProps, "attachments" | "busy" | "onRemoveAttachment">
> = ({ attachments, busy, onRemoveAttachment }) => {
  return (
    <>
      {attachments.length > 0 && (
        <AttachmentGroup
          className={styles["composer-attachments"]}
          data-composer-attachments
          aria-label="Додані фото"
        >
          {attachments.map((item) => (
            <Attachment key={item.id} state={item.state} size="sm" orientation="vertical">
              <AttachmentMedia variant="image">
                <img src={item.previewUrl} alt="" />
              </AttachmentMedia>
              <AttachmentActions>
                <AttachmentAction
                  aria-label="Прибрати фото"
                  disabled={busy}
                  onClick={() => onRemoveAttachment(item.id)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
    </>
  );
};
