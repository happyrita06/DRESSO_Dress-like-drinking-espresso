import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import { registerUser } from '../utils/authApi'
import { useAuth } from '../hooks/useAuth'
import styles from './Register.module.css'

function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    nickname: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.nickname.trim()) nextErrors.nickname = '닉네임을 입력해주세요.'
    if (!form.email.trim()) nextErrors.email = '이메일을 입력해주세요.'
    if (form.password.length < 6) nextErrors.password = '비밀번호는 6자 이상이어야 해요.'
    if (form.passwordConfirm !== form.password) {
      nextErrors.passwordConfirm = '비밀번호가 서로 달라요.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const { token, user } = await registerUser({
        email: form.email,
        password: form.password,
        nickname: form.nickname,
      })
      login(user, token)
      navigate('/')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <Card accent="lavender" className={styles.card}>
        <p className={styles.eyebrow}>Join Dresso</p>
        <h1 className={styles.title}>회원가입</h1>
        <p className={styles.subtitle}>날씨에 딱 맞는 코디, 지금 시작해봐요.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="닉네임"
            id="register-nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            placeholder="드레소"
            value={form.nickname}
            onChange={handleChange}
            error={errors.nickname}
            required
          />
          <Input
            label="이메일"
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            required
          />
          <Input
            label="비밀번호"
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="6자 이상"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <Input
            label="비밀번호 확인"
            id="register-password-confirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            placeholder="한 번 더 입력해주세요"
            value={form.passwordConfirm}
            onChange={handleChange}
            error={errors.passwordConfirm}
            required
          />

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
            가입하기
          </Button>
        </form>

        <p className={styles.switch}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className={styles.switchLink}>
            로그인
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default Register
