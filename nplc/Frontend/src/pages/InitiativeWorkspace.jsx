import { useState } from 'react'
import InitiativeHeader from '../components/InitiativeHeader'
import DecisionTimeline from './DecisionTimeline'
import AskContext from './AskContext'

// All initiative-scoped views live behind one route and swap client-side via tab state,
// matching the prototype: clicking Timeline/Ask never navigates or reloads.
// Add source is a side sheet (see InitiativeHeader), not a tab or page.
export default function InitiativeWorkspace() {
  const [tab, setTab] = useState('timeline')
  // Bumped whenever the header imports/syncs/adds something, so the tabs refetch.
  const [refreshTick, setRefreshTick] = useState(0)
  const onChanged = () => setRefreshTick(t => t + 1)

  return (
    <div className="h-full flex flex-col">
      <InitiativeHeader activeTab={tab} onTabChange={setTab} onChanged={onChanged} />
      <div className="flex-1 min-h-0">
        {tab === 'timeline' && <DecisionTimeline refreshTick={refreshTick} />}
        {tab === 'ask' && <AskContext />}
      </div>
    </div>
  )
}
