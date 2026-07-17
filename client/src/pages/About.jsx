import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Card from '../components/Card'
import FloatingClothesCollage from '../components/FloatingClothesCollage'
import { revealFrom, prefersReducedMotion } from '../utils/scrollReveal'
import styles from './About.module.css'

const STEPS = [
  {
    title: '위치 설정',
    description: '내 위치를 설정하면 지금 우리 동네 날씨에 딱 맞는 정보를 받아볼 수 있어요.',
    accent: 'pink',
  },
  {
    title: '스타일 선택',
    description: '성별과 선호 스타일을 골라두면 취향에 맞는 코디만 골라서 추천해드려요.',
    accent: 'mint',
  },
  {
    title: '추천 받기',
    description: '오늘 기온과 강수 소식을 반영한 코디를 아우터부터 액세서리까지 한 번에 받아보세요.',
    accent: 'sky',
  },
  {
    title: '옷장/캘린더 활용',
    description: '마음에 든 아이템은 내 옷장에 저장하고, 캘린더에 기록해서 다음에 또 활용해보세요.',
    accent: 'pink',
  },
]

const LEGAL_SECTIONS = [
  {
    id: 'terms',
    title: '서비스 이용약관',
    paragraphs: [
      'Dresso는 위치 기반 날씨 정보를 바탕으로 코디를 추천하고, 사용자가 자신의 옷장을 기록하고 다른 사람들과 스타일을 공유할 수 있도록 돕는 서비스입니다.',
      '이용자는 서비스를 이용하면서 타인의 권리를 침해하거나 허위 정보를 등록하지 않아야 하며, 커뮤니티 이용 시 다른 사용자를 존중하는 태도를 지켜주세요.',
      '서비스는 예고 없이 일부 기능이 변경되거나 일시 중단될 수 있으며, 이 경우 가능한 한 빠르게 안내드리려고 노력합니다.',
      '이 약관은 학습·포트폴리오 목적의 데모 프로젝트에 맞춰 작성된 예시 문서이며, 실제 법률 자문을 대체하지 않습니다.',
    ],
  },
  {
    id: 'privacy',
    title: '개인정보 처리방침',
    paragraphs: [
      'Dresso는 회원가입 시 이메일, 닉네임 등 서비스 제공에 필요한 최소한의 정보만 수집하며, 위치 정보는 날씨 조회 목적으로만 사용됩니다.',
      '수집된 정보는 코디 추천, 옷장 관리, 커뮤니티 기능 등 서비스 제공 목적 외에는 사용하지 않으며, 별도 동의 없이 제3자에게 제공하지 않습니다.',
      '이용자는 언제든지 자신의 개인정보 열람, 수정, 삭제를 요청할 수 있고, 계정 탈퇴 시 관련 정보는 관계 법령이 정하는 기간을 제외하고 지체 없이 파기됩니다.',
      '이 방침 역시 학습·포트폴리오 목적의 데모 프로젝트를 위한 예시 문서이며, 최종 법률 검토를 거친 내용이 아닙니다.',
    ],
  },
]

function AccordionItem({ title, paragraphs, isOpen, onToggle }) {
  return (
    <div className={styles.accordionItem}>
      <button
        type="button"
        className={styles.accordionHeader}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span className={`${styles.accordionIcon} ${isOpen ? styles.accordionIconOpen : ''}`} aria-hidden="true">
          +
        </span>
      </button>
      <div className={`${styles.accordionPanel} ${isOpen ? styles.accordionPanelOpen : ''}`}>
        <div className={styles.accordionPanelInner}>
          <div className={styles.accordionContent}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 12)}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function About() {
  const [openSection, setOpenSection] = useState(null)

  const pageRef = useRef(null)
  const introRef = useRef(null)
  const stepsRef = useRef(null)
  const legalRef = useRef(null)

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id))
  }

  // Same shape as Home.jsx: hero fades on mount, everything below is a
  // real scroll reveal, once: true throughout (see scrollReveal.js).
  useEffect(() => {
    if (prefersReducedMotion()) return undefined

    const ctx = gsap.context(() => {
      revealFrom(introRef.current.children, {
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
      })

      revealFrom(`.${styles.stepCard}`, {
        opacity: 0,
        y: 32,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.1,
        scrollTrigger: { trigger: stepsRef.current, start: 'top 82%', once: true },
      })

      revealFrom(`.${styles.accordionItem}`, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: { trigger: legalRef.current, start: 'top 85%', once: true },
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.intro} ref={introRef}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}>About app</p>
          <h1 className={styles.title}>Dresso 소개</h1>
          <p className={styles.lede}>
            Dresso는 오늘의 날씨에 딱 맞는 옷차림을 추천해주는 서비스예요. 내 옷장을 정리하고, 마음에
            드는 코디를 캘린더에 기록하고, 다른 사람들의 스타일도 구경할 수 있어요. 매일 아침 &quot;오늘
            뭐 입지?&quot;라는 고민을 커피 한 잔처럼 가볍게 덜어드릴게요.
          </p>
        </div>
        <FloatingClothesCollage className={styles.introCollage} />
      </header>

      <section className={styles.stepsSection} ref={stepsRef}>
        <h2 className={styles.sectionTitle}>이렇게 써보세요</h2>
        <div className={styles.stepsGrid}>
          {STEPS.map((step, index) => (
            <Card key={step.title} accent={step.accent} className={styles.stepCard}>
              <span className={styles.stepBadge}>{index + 1}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.legalSection} ref={legalRef}>
        <h2 className={styles.sectionTitle}>더 알아보기</h2>
        <div className={styles.accordion}>
          {LEGAL_SECTIONS.map((section) => (
            <AccordionItem
              key={section.id}
              title={section.title}
              paragraphs={section.paragraphs}
              isOpen={openSection === section.id}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default About
