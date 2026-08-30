import { useMemo, useState } from 'react'
import { useTranslation } from '../i18n.js'

function buildSlides(t) {
  return [
    {
      img: '/tour/01-welcome.png',
      title: t('tour.slide1.title'),
      text: t('tour.slide1.text'),
      list: [t('tour.slide1.l1'), t('tour.slide1.l2'), t('tour.slide1.l3')],
    },
    {
      img: '/tour/02-toolbar.png',
      title: t('tour.slide2.title'),
      text: t('tour.slide2.text'),
      list: [t('tour.slide2.l1'), t('tour.slide2.l2'), t('tour.slide2.l3'), t('tour.slide2.l4')],
    },
    {
      img: '/tour/03-palette.png',
      title: t('tour.slide3.title'),
      text: t('tour.slide3.text'),
      list: [t('tour.slide3.l1'), t('tour.slide3.l2'), t('tour.slide3.l3'), t('tour.slide3.l4')],
    },
    {
      img: '/tour/04-canvas.png',
      title: t('tour.slide4.title'),
      text: t('tour.slide4.text'),
      list: [
        t('tour.slide4.l1'),
        t('tour.slide4.l2'),
        t('tour.slide4.l3'),
        t('tour.slide4.l4'),
        t('tour.slide4.l5'),
        t('tour.slide4.l6'),
      ],
    },
    {
      img: '/tour/04-canvas.png',
      title: t('tour.slide5.title'),
      text: t('tour.slide5.text'),
      list: [
        t('tour.slide5.l1'),
        t('tour.slide5.l2'),
        t('tour.slide5.l3'),
        t('tour.slide5.l4'),
        t('tour.slide5.l5'),
      ],
    },
    {
      img: '/tour/05-node-config.png',
      title: t('tour.slide6.title'),
      text: t('tour.slide6.text'),
      list: [
        t('tour.slide6.l1'),
        t('tour.slide6.l2'),
        t('tour.slide6.l3'),
        t('tour.slide6.l4'),
        t('tour.slide6.l5'),
      ],
    },
    {
      img: '/tour/01-welcome.png',
      title: t('tour.slide7.title'),
      text: t('tour.slide7.text'),
      list: [t('tour.slide7.l1'), t('tour.slide7.l2'), t('tour.slide7.l3')],
      last: true,
    },
  ]
}

export default function TourModal({ onClose, onDone }) {
  const { t } = useTranslation()
  const slides = useMemo(() => buildSlides(t), [t])
  const [i, setI] = useState(0)
  const s = slides[i]
  const isLast = i === slides.length - 1
  const next = () => (isLast ? onDone?.() : setI((v) => v + 1))

  return (
    <div className="tour-overlay">
      <div className="tour-card">
        <div className="tour-head">
          <span className="tour-title">{t('tour.title')}</span>
          <span className="tour-step">{i + 1} / {slides.length}</span>
          <button className="btn btn-small btn-ghost" onClick={onDone}>{t('tour.skip')}</button>
        </div>
        <div className="tour-body">
          <div className="tour-visual">
            <img src={s.img} alt={s.title} />
          </div>
          <div className="tour-text">
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <ul>
              {s.list.map((item, k) => (
                <li key={k}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="tour-nav">
          <button className="btn" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
            {t('tour.prev')}
          </button>
          <div className="tour-dots">
            {slides.map((_, k) => (
              <span key={k} className={k === i ? 'active' : ''} onClick={() => setI(k)} />
            ))}
          </div>
          <button className="btn btn-primary" onClick={next}>
            {isLast ? t('tour.start') : t('tour.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
