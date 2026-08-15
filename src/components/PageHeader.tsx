import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  extra?: ReactNode
}

export default function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
  return (
    <div className="page-head">
      <div>
        <h2>{title}</h2>
        {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
      </div>
      {extra ? <div>{extra}</div> : null}
    </div>
  )
}
