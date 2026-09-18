import { useState } from 'react'
import InitiativeHeader from '../components/InitiativeHeader'
import DecisionTimeline from './DecisionTimeline'
import ChangeImpact from './ChangeImpact'
import AskContext from './AskContext'
import ResumeBrief from './ResumeBrief'
import SourcesList from './SourcesList'

// All initiative-scoped views live behind one route and swap client-side via tab state,
// matching the prototype: clicking Timeline/Scope/Ask/Brief never navigates or reloads.
// Add source / Add decision are side sheets (see InitiativeHeader), not tabs or pages.
export default function InitiativeWorkspace() {
  const [tab, setTab] = useState('timeline')
  // Bumped whenever the header imports/syncs/adds something, so the tabs refetch.
  const [refreshTick, setRefreshTick] = useState(0)
  const onChanged = () => setRefreshTick(t => t + 1)

  return (
    <div>
      <InitiativeHeader activeTab={tab} onTabChange={setTab} onChanged={onChanged} />
      {tab === 'timeline' && <DecisionTimeline refreshTick={refreshTick} />}
      {tab === 'impact' && <ChangeImpact refreshTick={refreshTick} />}
      {tab === 'ask' && <AskContext />}
      {tab === 'brief' && <ResumeBrief />}
      {tab === 'sources' && <SourcesList refreshTick={refreshTick} />}
    </div>
  )
}
