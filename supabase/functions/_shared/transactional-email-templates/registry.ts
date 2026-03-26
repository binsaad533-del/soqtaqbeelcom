/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as dealCompleted } from './deal-completed.tsx'
import { template as offerStatusUpdate } from './offer-status-update.tsx'
import { template as newNegotiationMessage } from './new-negotiation-message.tsx'
import { template as dealStatusChange } from './deal-status-change.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'deal-completed': dealCompleted,
  'offer-status-update': offerStatusUpdate,
  'new-negotiation-message': newNegotiationMessage,
  'deal-status-change': dealStatusChange,
  'contact-confirmation': contactConfirmation,
}
