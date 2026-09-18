import { useState } from 'react'
import InitiativeHeader from '../components/InitiativeHeader'
import DecisionTimeline from './DecisionTimeline'
import ChangeImpact from './ChangeImpact'
import AskContext from './AskContext'
import ResumeBrief from './ResumeBrief'

// All initiative-scoped views live behind one route and swap client-side via tab state,
// matching the prototype: clicking Timeline/Scope/Ask/Brief never navigates or reloads.
// Add source / Add decision are side sheets (see InitiativeHeader), not tabs or pages.
export default function InitiativeWorkspace() {
  const [tab, setTab] = useState('timeline')

  return (
    <div>
      <InitiativeHeader activeTab={tab} onTabChange={setTab} />
      {tab === 'timeline' && <DecisionTimeline />}
      {tab === 'impact' && <ChangeImpact />}
      {tab === 'ask' && <AskContext />}
      {tab === 'brief' && <ResumeBrief />}
    </div>
  )
}
