import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'

export const PRIORITIES = [
  { value: 'HIGH', label: 'High', dot: '#f87171' },
  { value: 'MEDIUM', label: 'Medium', dot: '#fbbf24' },
  { value: 'LOW', label: 'Low', dot: '#60a5fa' },
]

export default function PrioritySelect({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map(p => (
          <SelectItem key={p.value} value={p.value}>
            <span
              style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: p.dot, marginRight: 8, verticalAlign: 'middle',
              }}
            />
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
