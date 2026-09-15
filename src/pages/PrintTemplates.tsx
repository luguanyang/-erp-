import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Modal, Space, Spin, Tabs, message } from 'antd'
import { CodeOutlined, SaveOutlined } from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import PrintPreview from '../components/PrintPreview'
import PrintTemplateFields from '../components/PrintTemplateFields'
import type { PrintTemplate } from '../types'

const thermalFallback: PrintTemplate = {
  headerText: '金港连锁门店下单系统',
  titleText: '订货单',
  footerText: '谢谢惠顾',
  showStore: true,
  showOrderNo: true,
  showTime: true,
  showRemark: true,
  showUnit: true,
  showPrice: true,
  showSubtotal: true,
  showTotal: true,
  showStorage: true,
  align: 'center',
  separator: '--------------------------------',
  itemGap: 1,
  showItemIndex: true,
  showCategory: true,
  thermalSizes: {
    header: 20,
    title: 12,
    category: 12,
    head: 12,
    store: 12,
    orderNo: 12,
    time: 12,
    remark: 12,
    storage: 12,
    name: 12,
    qty: 12,
    price: 12,
    subtotal: 12,
    total: 12,
    footer: 12,
  },
}

const labelFallback: PrintTemplate = {
  headerText: '金港订货单',
  titleText: '订货单',
  footerText: '',
  showStore: true,
  showOrderNo: true,
  showTime: true,
  showRemark: true,
  showUnit: true,
  showPrice: true,
  showSubtotal: true,
  showTotal: true,
  showStorage: true,
  align: 'left',
  separator: '',
  labelWidth: 60,
  labelHeight: 40,
  fontSize: 12,
  lineGap: 6,
  emphasizeName: false,
  fontSizes: {
    header: 12,
    title: 12,
    store: 12,
    orderNo: 12,
    time: 12,
    remark: 12,
    storage: 12,
    name: 12,
    qty: 12,
    price: 12,
    subtotal: 12,
    footer: 12,
  },
}

export default function PrintTemplates() {
  const [form] = Form.useForm<PrintTemplate>()
  const [type, setType] = useState<'thermal' | 'label'>('thermal')
  const [defaults, setDefaults] = useState<Record<'thermal' | 'label', PrintTemplate>>({
    thermal: thermalFallback,
    label: labelFallback,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const watched = Form.useWatch<PrintTemplate>([], form)
  const current = watched || defaults[type]

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [thermal, label] = await Promise.all([
        api.printTemplateGet('thermal'),
        api.printTemplateGet('label'),
      ])
      const next = { thermal: thermal.template, label: label.template }
      setDefaults(next)
      form.setFieldsValue(next[type])
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载模板失败')
    } finally {
      setLoading(false)
    }
  }, [form, type])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  function changeType(next: string) {
    const nextType = next === 'label' ? 'label' : 'thermal'
    setType(nextType)
    form.setFieldsValue(defaults[nextType])
  }

  function normalizedValues() {
    const values = form.getFieldsValue()
    return Object.assign({}, defaults[type], values)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await api.printTemplateUpdate(type, normalizedValues())
      setDefaults((prev) => ({ ...prev, [type]: res.template }))
      form.setFieldsValue(res.template)
      message.success('默认模板已保存')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function preview() {
    setPreviewLoading(true)
    try {
      const res = await api.printTemplatePreview(type, normalizedValues())
      setPreviewContent(
        res.contents.length > 1
          ? res.contents.join('\n\n===== 下一张 =====\n\n')
          : res.contents[0] || '',
      )
      setPreviewOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '预览生成失败')
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="打印模板"
        subtitle="维护热敏小票和标签打印的内容样式，小程序与后台打印会同时生效。"
        extra={
          <Space>
            <Button onClick={loadAll}>重新加载</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
              保存默认模板
            </Button>
          </Space>
        }
      />
      <div className="template-workbench">
        <div className="template-form-panel">
          <Tabs
            activeKey={type}
            onChange={changeType}
            items={[
              { key: 'thermal', label: '热敏小票' },
              { key: 'label', label: '标签打印' },
            ]}
          />
          <Spin spinning={loading}>
            <Form<PrintTemplate> form={form} layout="vertical" className="template-form">
              <PrintTemplateFields type={type} />
            </Form>
          </Spin>
        </div>
        <div className="template-preview-panel">
          <div className="preview-toolbar">
            <span>实时预览</span>
            <Button size="small" icon={<CodeOutlined />} loading={previewLoading} onClick={preview}>
              查看生成内容
            </Button>
          </div>
          <div className="preview-stage">
            <PrintPreview type={type} template={current} />
          </div>
        </div>
      </div>
      <Modal
        title="后端实际生成内容"
        open={previewOpen}
        width={680}
        footer={
          <Button type="primary" onClick={() => setPreviewOpen(false)}>
            关闭
          </Button>
        }
        onCancel={() => setPreviewOpen(false)}
      >
        <pre className="print-content-code">{previewContent}</pre>
      </Modal>
    </>
  )
}
