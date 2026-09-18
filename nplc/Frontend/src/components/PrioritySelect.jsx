import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { useLanguage } from '../context/LanguageContext'

export const PRIORITY_VALUES = [
  { value: 'HIGH', dot: '#f87171' },
  { value: 'MEDIUM', dot: '#fbbf24' },
  { value: 'LOW', dot: '#60a5fa' },
]

// Keep PRIORITIES exported for any code that consumes the label externally,
// but labels are now derived inside the component via t().
export const PRIORITIES = PRIORITY_VALUES

export default function PrioritySelect({ value, onChange }) {
  const { t } = useLanguage()

  const priorities = [
    { value: 'HIGH', label: t('priority.high'), dot: '#f87171' },
    { value: 'MEDIUM', label: t('priority.medium'), dot: '#fbbf24' },
    { value: 'LOW', label: t('priority.low'), dot: '#60a5fa' },
  ]

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {priorities.map(p => (
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
