import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

let registered = false;

function ensureRegistered() {
  if (typeof window !== 'undefined' && !registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }

  return {
    gsap,
    ScrollTrigger
  };
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createSceneMotion(rootElement, buildTimeline) {
  const { gsap: motionGsap, ScrollTrigger: motionScrollTrigger } = ensureRegistered();

  if (!rootElement || prefersReducedMotion()) {
    return () => {};
  }

  const context = motionGsap.context(() => {
    buildTimeline({
      gsap: motionGsap,
      ScrollTrigger: motionScrollTrigger
    });
  }, rootElement);

  return () => {
    context.revert();
  };
}

export function createSceneReveals({
  gsap: motionGsap,
  ScrollTrigger: motionScrollTrigger,
  sceneSelector,
  itemSelector = '[data-reveal]',
  start = 'top 78%',
  y = 28,
  duration = 0.8,
  stagger = 0.08
}) {
  const scenes = motionGsap.utils.toArray(sceneSelector);

  const animateScene = (scene) => {
    if (!scene || scene.dataset.sceneRevealed === 'true') {
      return;
    }

    const targets = scene.querySelectorAll(itemSelector);

    if (!targets.length) {
      return;
    }

    scene.dataset.sceneRevealed = 'true';

    motionGsap.fromTo(
      targets,
      {
        autoAlpha: 0,
        y
      },
      {
        autoAlpha: 1,
        y: 0,
        duration,
        stagger,
        ease: 'power3.out',
        clearProps: 'opacity,visibility,transform'
      }
    );
  };

  scenes.forEach((scene) => {
    const targets = scene.querySelectorAll(itemSelector);

    if (!targets.length) {
      return;
    }

    if (scene.getBoundingClientRect().top <= window.innerHeight * 0.82) {
      animateScene(scene);
    }

    motionScrollTrigger.create({
      trigger: scene,
      start,
      once: true,
      onEnter: () => animateScene(scene)
    });
  });

  requestAnimationFrame(() => motionScrollTrigger.refresh());
}
