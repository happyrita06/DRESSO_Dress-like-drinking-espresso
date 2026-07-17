import { useState } from 'react'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import { apiRequest } from '../utils/apiClient'
import styles from './Contact.module.css'

const INQUIRY_TYPES = ['일반 문의', '버그 신고', '계정 문의', '기타']

const INITIAL_FORM = {
  name: '',
  email: '',
  inquiryType: '',
  message: '',
}

function Contact() {
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
    if (!form.name.trim()) nextErrors.name = '이름을 입력해주세요.'
    if (!form.email.trim()) nextErrors.email = '이메일을 입력해주세요.'
    if (!form.inquiryType) nextErrors.inquiryType = '문의 유형을 선택해주세요.'
    if (!form.message.trim()) nextErrors.message = '내용을 입력해주세요.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await apiRequest('/contact', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          inquiryType: form.inquiryType,
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
        <p className={styles.eyebrow}>Get in touch</p>
        <h1 className={styles.title}>문의하기</h1>
        <p className={styles.lede}>
          궁금한 점이나 불편한 점이 있으면 편하게 남겨주세요. 확인 후 빠르게 답변드릴게요.
        </p>
      </header>

      <Card accent="lavender" className={styles.card}>
        {isSubmitted ? (
          <div className={styles.confirm}>
            <h2 className={styles.confirmTitle}>문의가 접수됐어요</h2>
            <p className={styles.confirmText}>빠르게 답변드릴게요. 소중한 의견 감사해요.</p>
            <Button type="button" variant="secondary" onClick={handleReset}>
              다른 문의 남기기
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Input
              label="이름"
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="홍길동"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <Input
              label="이메일"
              id="contact-email"
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
              <label className={styles.label} htmlFor="contact-inquiry-type">
                문의 유형
                <span className={styles.required} aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="contact-inquiry-type"
                name="inquiryType"
                className={styles.select}
                value={form.inquiryType}
                onChange={handleChange}
                aria-invalid={Boolean(errors.inquiryType)}
                aria-describedby={errors.inquiryType ? 'contact-inquiry-type-error' : undefined}
                required
              >
                <option value="">문의 유형을 선택해주세요</option>
                {INQUIRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.inquiryType && (
                <p id="contact-inquiry-type-error" className={styles.fieldError} role="alert">
                  {errors.inquiryType}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact-message">
                내용
                <span className={styles.required} aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                className={styles.textarea}
                placeholder="문의하실 내용을 자세히 적어주세요."
                value={form.message}
                onChange={handleChange}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                required
              />
              {errors.message && (
                <p id="contact-message-error" className={styles.fieldError} role="alert">
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
              문의 보내기
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}

export default Contact
