import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import { loginUser } from '../utils/authApi'
import { useAuth } from '../hooks/useAuth'
import styles from './Login.module.css'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
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
    if (!form.email.trim()) nextErrors.email = '이메일을 입력해주세요.'
    if (!form.password) nextErrors.password = '비밀번호를 입력해주세요.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const { token, user } = await loginUser(form)
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
      <Card accent="pink" className={styles.card}>
        <p className={styles.eyebrow}>Welcome back</p>
        <h1 className={styles.title}>로그인</h1>
        <p className={styles.subtitle}>오늘 날씨엔 뭘 입을지, 다시 만나서 반가워요.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="이메일"
            id="login-email"
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
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
            로그인하기
          </Button>
        </form>

        <p className={styles.switch}>
          아직 계정이 없으신가요?{' '}
          <Link to="/register" className={styles.switchLink}>
            회원가입
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default Login
