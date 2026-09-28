import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Input, type InputRef } from 'antd'
import { matchesProductText } from '../utils/pinyin'

export interface ProductInlineOption {
  value: string
  label: string
}

export interface ProductInlineSelectRef {
  focus: () => void
}

interface ProductInlineSelectProps {
  value?: string
  options: ProductInlineOption[]
  placeholder?: string
  disabled?: boolean
  onChange?: (value: string) => void
  onCommit?: (value: string) => void
  onOpen?: () => void
}

const ProductInlineSelect = forwardRef<
  ProductInlineSelectRef,
  ProductInlineSelectProps
>(function ProductInlineSelect(
  {
    value = '',
    options,
    placeholder = '选择商品',
    disabled = false,
    onChange,
    onCommit,
    onOpen,
  },
  ref,
) {
  const inputRef = useRef<InputRef>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedOption = options.find((option) => option.value === value)
  const selectedLabel = selectedOption?.label || ''
  const keyword = search.trim()
  const visibleOptions = keyword
    ? options.filter((option) => matchesProductText(keyword, option.label))
    : options

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }))

  useEffect(() => {
    if (!open) setSearch(selectedLabel)
  }, [open, selectedLabel])

  useEffect(() => {
    if (!open) return
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`,
    )
    node?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, open])

  function openList() {
    if (disabled) return
    setOpen(true)
    setHighlightedIndex(0)
    onOpen?.()
    setTimeout(() => {
      rootRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
  }

  function commit(option: ProductInlineOption | undefined) {
    if (!option) return
    setOpen(false)
    setSearch(option.label)
    onChange?.(option.value)
    onCommit?.(option.value)
  }

  function closeList() {
    setOpen(false)
    setSearch(selectedLabel)
  }

  function moveHighlight(direction: 1 | -1) {
    if (!open) {
      openList()
      return
    }
    if (!visibleOptions.length) return
    setHighlightedIndex((current) => {
      const next = current + direction
      if (next < 0) return visibleOptions.length - 1
      if (next >= visibleOptions.length) return 0
      return next
    })
  }

  return (
    <div className="product-inline-select" ref={rootRef}>
      <Input
        ref={inputRef}
        value={open ? search : selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={(event) => {
          event.currentTarget.select()
          openList()
        }}
        onChange={(event) => {
          setSearch(event.target.value)
          setHighlightedIndex(0)
          if (!open) setOpen(true)
        }}
        onBlur={closeList}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            moveHighlight(1)
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            moveHighlight(-1)
            return
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault()
            commit(visibleOptions[highlightedIndex])
            return
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            closeList()
            return
          }
          if (/^[0-9]$/.test(event.key) && keyword) {
            const index = event.key === '0' ? 9 : Number(event.key) - 1
            const target = visibleOptions[index]
            if (!target) return
            event.preventDefault()
            commit(target)
          }
        }}
      />
      {open ? (
        <div className="product-inline-list" ref={listRef}>
          {visibleOptions.length ? (
            visibleOptions.map((option, index) => (
              <div
                key={option.value}
                data-option-index={index}
                className={`product-inline-option${
                  index === highlightedIndex ? ' active' : ''
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  commit(option)
                }}
              >
                {keyword ? <span className="product-inline-index">{index + 1}.</span> : null}
                <span>{option.label}</span>
              </div>
            ))
          ) : (
            <div className="product-inline-empty">没有匹配的商品</div>
          )}
        </div>
      ) : null}
    </div>
  )
})

export default ProductInlineSelect
