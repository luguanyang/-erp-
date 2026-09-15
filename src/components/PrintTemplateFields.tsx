import { Col, Divider, Form, Input, InputNumber, Row, Select, Switch } from 'antd'

interface PrintTemplateFieldsProps {
  type: 'thermal' | 'label'
}

const showFields = [
  { name: 'showStore', label: '门店' },
  { name: 'showOrderNo', label: '订单号' },
  { name: 'showTime', label: '下单时间' },
  { name: 'showRemark', label: '备注' },
  { name: 'showUnit', label: '单位' },
  { name: 'showPrice', label: '单价' },
  { name: 'showSubtotal', label: '小计' },
  { name: 'showTotal', label: '合计' },
  { name: 'showStorage', label: '暂存仓库' },
]

const labelFontSizeFields = [
  { key: 'header', label: '顶部标题' },
  { key: 'title', label: '单据标题' },
  { key: 'store', label: '门店' },
  { key: 'orderNo', label: '订单号' },
  { key: 'time', label: '下单时间' },
  { key: 'remark', label: '备注' },
  { key: 'storage', label: '暂存仓库' },
  { key: 'name', label: '商品名称' },
  { key: 'qty', label: '数量' },
  { key: 'price', label: '单价' },
  { key: 'subtotal', label: '小计' },
  { key: 'footer', label: '结尾' },
]

const thermalSizeFields = [
  { key: 'header', label: '顶部标题' },
  { key: 'title', label: '单据标题' },
  { key: 'head', label: '表头' },
  { key: 'store', label: '门店' },
  { key: 'orderNo', label: '订单号' },
  { key: 'time', label: '下单时间' },
  { key: 'remark', label: '备注' },
  { key: 'category', label: '分类标题' },
  { key: 'storage', label: '暂存仓库' },
  { key: 'name', label: '商品名称' },
  { key: 'qty', label: '数量' },
  { key: 'price', label: '单价' },
  { key: 'subtotal', label: '小计' },
  { key: 'total', label: '合计' },
  { key: 'footer', label: '结尾' },
]

export default function PrintTemplateFields({ type }: PrintTemplateFieldsProps) {
  const form = Form.useFormInstance()

  function syncAllFontSizes(value: number | null) {
    if (type !== 'label' || typeof value !== 'number') return
    const fontSizes = form.getFieldValue('fontSizes') || {}
    const next: Record<string, number> = {}
    Object.keys(fontSizes).forEach((key) => {
      next[key] = value
    })
    form.setFieldsValue({ fontSizes: next })
  }

  function syncAllThermalSizes(value: number | null) {
    if (type !== 'thermal' || typeof value !== 'number') return
    const next: Record<string, number> = {}
    thermalSizeFields.forEach((field) => {
      next[field.key] = value
    })
    form.setFieldsValue({ thermalSizes: next })
  }

  return (
    <>
      <Divider orientation="left">文本内容</Divider>
      <Form.Item name="headerText" label="顶部标题" rules={[{ max: 30, message: '最多 30 个字符' }]}>
        <Input placeholder="如 金港连锁门店下单系统" showCount maxLength={30} />
      </Form.Item>
      <Form.Item name="titleText" label="单据标题" rules={[{ max: 20, message: '最多 20 个字符' }]}>
        <Input placeholder="如 订货单" showCount maxLength={20} />
      </Form.Item>
      <Form.Item name="footerText" label="结尾文字" rules={[{ max: 20, message: '最多 20 个字符' }]}>
        <Input placeholder="如 谢谢惠顾" showCount maxLength={20} />
      </Form.Item>
      <Form.Item name="separator" label="分隔线">
        <Input placeholder="如 --------------------------------" maxLength={40} />
      </Form.Item>
      <Form.Item name="align" label="标题对齐">
        <Select
          options={[
            { value: 'center', label: '居中' },
            { value: 'left', label: '左对齐' },
          ]}
        />
      </Form.Item>
      <Divider orientation="left">显示内容</Divider>
      <Row gutter={[12, 4]}>
        {showFields.map((field) => (
          <Col span={8} key={field.name}>
            <Form.Item name={field.name} label={field.label} valuePropName="checked">
              <Switch size="small" />
            </Form.Item>
          </Col>
        ))}
      </Row>
      {type === 'thermal' ? (
        <>
          <Divider orientation="left">显示内容字号</Divider>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="showItemIndex" label="商品序号" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="showCategory" label="分类标题" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="itemGap" label="商品间距">
                <InputNumber min={0} max={5} addonAfter="行" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="统一设置">
            <InputNumber
              min={8}
              max={48}
              placeholder="设置后应用到全部显示内容"
              style={{ width: '100%' }}
              onChange={syncAllThermalSizes}
            />
          </Form.Item>
          <Row gutter={[12, 4]}>
            {thermalSizeFields.map((field) => (
              <Col span={6} key={field.key}>
                <Form.Item name={['thermalSizes', field.key]} label={field.label}>
                  <InputNumber min={8} max={48} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <div className="template-field-tip">
            热敏打印机按数字区间映射：8-16 正常、17-48 等比放大一倍；飞鹅热敏只支持“正常/放大一倍”两档，25 以上不会更大。
            商品明细字号超过 16 时，会自动拆行显示；“商品间距”控制每个商品与下一个商品之间的空行数，
            “商品序号”会在每个商品前自动添加 1、2、3 序号，“分类标题”按荤菜/素菜/物料分组显示。
          </div>
        </>
      ) : type === 'label' ? (
        <>
          <Divider orientation="left">标签尺寸</Divider>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="labelWidth" label="宽度 (mm)">
                <InputNumber min={20} max={120} addonAfter="mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="labelHeight" label="高度 (mm)">
                <InputNumber min={20} max={200} addonAfter="mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fontSize" label="字号">
                <InputNumber min={8} max={48} style={{ width: '100%' }} onChange={syncAllFontSizes} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="lineGap" label="行距">
                <InputNumber min={0} max={30} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">显示内容字号</Divider>
          <Row gutter={[12, 4]}>
            {labelFontSizeFields.map((field) => (
              <Col span={6} key={field.key}>
                <Form.Item name={['fontSizes', field.key]} label={field.label}>
                  <InputNumber min={8} max={48} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <div className="template-field-tip">
            标签打印机按实际字体档位打印：8-16 标准、17-24 高倍、25-32 倍大、33-48 更大；
            下单时间单独支持四档递增；
            行距数值按 0.2mm/档生效，空间不足时优先压缩次要行而不是字号。
          </div>
        </>
      ) : null}
    </>
  )
}
