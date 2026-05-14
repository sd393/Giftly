import type { ComponentType } from 'react'

import type { PipelineStageId } from '../lib/types'

import { Stage1RawCapture } from './stage-1-raw-capture'
import { Stage2ChannelSplit } from './stage-2-channel-split'
import { Stage5Corpus } from './stage-5-corpus'
import { Stage6Schema } from './stage-6-schema'
import { Stage7Matrix } from './stage-7-matrix'

export type Stage = {
  id: PipelineStageId
  title: string
  subtitle: string
  Component: ComponentType
}

export const STAGES: Stage[] = [
  {
    id: 'raw-capture',
    title: 'Raw capture',
    subtitle: 'One file. Two channels.',
    Component: Stage1RawCapture,
  },
  {
    id: 'channel-split',
    title: 'Channel split',
    subtitle: 'Three models analyze in parallel.',
    Component: Stage2ChannelSplit,
  },
  {
    id: 'corpus',
    title: 'Corpus accumulation',
    subtitle: 'Wait for volume.',
    Component: Stage5Corpus,
  },
  {
    id: 'schema-discovery',
    title: 'Schema discovery',
    subtitle: 'What matters across the category.',
    Component: Stage6Schema,
  },
  {
    id: 'product-rescoring',
    title: 'Product rescoring',
    subtitle: 'Every product, one comparable matrix.',
    Component: Stage7Matrix,
  },
]
