import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useBackgroundPause } from './hooks/useBackgroundPause'
import { UserProvider } from './contexts/UserContext'
import { LocationProvider } from './contexts/LocationContext'
import { StyleProvider } from './contexts/StyleContext'
import Header from './components/Header'
import Footer from './components/Footer'
import PixelSky from './components/PixelSky'
import ShootingStars from './components/ShootingStars'
import ParallaxBackground from './components/ParallaxBackground'
import GradientMesh from './components/GradientMesh'
import FloatingParticles from './components/FloatingParticles'
import ClickSpark from './components/ClickSpark'
import Dither from './components/Dither'
import PageTransition from './components/PageTransition'
import SplashIntro from './components/SplashIntro'
import Home from './pages/Home'
import MyWardrobe from './pages/MyWardrobe'
import OutfitRecommend from './pages/OutfitRecommend'
import PixelDressUp from './pages/PixelDressUp'
import ShareFits from './pages/ShareFits'
import Calendar from './pages/Calendar'
import Community from './pages/Community'
import About from './pages/About'
import Contact from './pages/Contact'
import Business from './pages/Business'
import Login from './pages/Login'
import Register from './pages/Register'
import Account from './pages/Account'
import styles from './App.module.css'

function App() {
  useBackgroundPause()

  return (
    <UserProvider>
      <LocationProvider>
        <StyleProvider>
          <BrowserRouter>
            <div className={styles.appShell}>
              <SplashIntro />
              <ParallaxBackground />
              <GradientMesh />
              <PixelSky />
              <ShootingStars />
              <FloatingParticles />
              <Dither
                waveColor={[1, 0.455, 0.722]}
                disableAnimation={false}
                enableMouseInteraction
                mouseRadius={0.225}
                colorNum={4}
                pixelSize={2.2}
                waveAmplitude={0.3}
                waveFrequency={3}
                waveSpeed={0.05}
              />
              <ClickSpark
                sparkColor="#ffffff"
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
                easing="ease-out"
                extraScale={1}
              />
              <Header />
              <main className={styles.main}>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/wardrobe" element={<MyWardrobe />} />
                    <Route path="/recommend" element={<OutfitRecommend />} />
                    <Route path="/dressup" element={<PixelDressUp />} />
                    <Route path="/share-fits" element={<ShareFits />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/business" element={<Business />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/account" element={<Account />} />
                  </Routes>
                </PageTransition>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </StyleProvider>
      </LocationProvider>
    </UserProvider>
  )
}

export default App
