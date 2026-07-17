import { useState } from 'react'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import { apiRequest } from '../utils/apiClient'
import styles from './Business.module.css'

const PROPOSAL_TYPES = ['광고', '제휴', '입점', '기타']

const INITIAL_FORM = {
  companyName: '',
  contactName: '',
  email: '',
  proposalType: '',
  message: '',
}

function Business() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.companyName.trim()) nextErrors.companyName = '회사명을 입력해주세요.'
    if (!form.contactName.trim()) nextErrors.contactName = '담당자명을 입력해주세요.'
    if (!form.email.trim()) nextErrors.email = '이메일을 입력해주세요.'
    if (!form.proposalType) nextErrors.proposalType = '제안 유형을 선택해주세요.'
    if (!form.message.trim()) nextErrors.message = '제안 내용을 입력해주세요.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await apiRequest('/business-inquiries', {
        method: 'POST',
        body: {
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          proposalType: form.proposalType,
          message: form.message.trim(),
        },
      })
      setIsSubmitted(true)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setErrors({})
    setFormError('')
    setIsSubmitted(false)
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Partner with us</p>
        <h1 className={styles.title}>비즈니스 제안</h1>
        <p className={styles.lede}>
          광고, 제휴, 입점 등 Dresso와 함께하고 싶은 제안이 있다면 남겨주세요. 검토 후 연락드릴게요.
        </p>
      </header>

      <Card accent="sky" className={styles.card}>
        {isSubmitted ? (
          <div className={styles.confirm}>
            <h2 className={styles.confirmTitle}>제안이 접수됐어요</h2>
            <p className={styles.confirmText}>검토 후 빠르게 답변드릴게요. 소중한 제안 감사해요.</p>
            <Button type="button" variant="secondary" onClick={handleReset}>
              다른 제안 남기기
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Input
              label="회사명"
              id="business-company-name"
              name="companyName"
              type="text"
              autoComplete="organization"
              placeholder="드레소 주식회사"
              value={form.companyName}
              onChange={handleChange}
              error={errors.companyName}
              required
            />
            <Input
              label="담당자명"
              id="business-contact-name"
              name="contactName"
              type="text"
              autoComplete="name"
              placeholder="홍길동"
              value={form.contactName}
              onChange={handleChange}
              error={errors.contactName}
              required
            />
            <Input
              label="이메일"
              id="business-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="business-proposal-type">
                제안 유형
                <span className={styles.required} aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="business-proposal-type"
                name="proposalType"
                className={styles.select}
                value={form.proposalType}
                onChange={handleChange}
                aria-invalid={Boolean(errors.proposalType)}
                aria-describedby={errors.proposalType ? 'business-proposal-type-error' : undefined}
                required
              >
                <option value="">제안 유형을 선택해주세요</option>
                {PROPOSAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.proposalType && (
                <p id="business-proposal-type-error" className={styles.fieldError} role="alert">
                  {errors.proposalType}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="business-message">
                제안 내용
                <span className={styles.required} aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                id="business-message"
                name="message"
                rows={6}
                className={styles.textarea}
                placeholder="제안하실 내용을 자세히 적어주세요."
                value={form.message}
                onChange={handleChange}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'business-message-error' : undefined}
                required
              />
              {errors.message && (
                <p id="business-message-error" className={styles.fieldError} role="alert">
                  {errors.message}
                </p>
              )}
            </div>

            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
              제안 보내기
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}

export default Business
