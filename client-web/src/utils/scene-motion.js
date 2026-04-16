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

  const matchMedia = motionGsap.matchMedia();

  const context = motionGsap.context((self) => {
    const scopedSelect = (selectorOrNodes) => {
      if (!selectorOrNodes) {
        return [];
      }

      if (typeof selectorOrNodes === 'string') {
        if (typeof self.selector === 'function') {
          return Array.from(self.selector(selectorOrNodes));
        }

        return Array.from(rootElement.querySelectorAll(selectorOrNodes));
      }

      if (selectorOrNodes instanceof Element) {
        return [selectorOrNodes];
      }

      return Array.from(selectorOrNodes).filter(Boolean);
    };

    buildTimeline({
      gsap: motionGsap,
      ScrollTrigger: motionScrollTrigger,
      matchMedia,
      root: rootElement,
      select: scopedSelect
    });
  }, rootElement);

  return () => {
    matchMedia.revert();
    context.revert();
  };
}

export function createSceneReveals({
  gsap: motionGsap,
  ScrollTrigger: motionScrollTrigger,
  root,
  select,
  scenes,
  sceneSelector,
  itemSelector = '[data-reveal]',
  start = 'top 78%',
  y = 28,
  duration = 0.8,
  stagger = 0.08,
  initialThreshold = 0.82
}) {
  const resolvedScenes = scenes
    ? Array.from(scenes).filter(Boolean)
    : typeof sceneSelector === 'string'
      ? select
        ? select(sceneSelector)
        : Array.from((root || document).querySelectorAll(sceneSelector))
      : motionGsap.utils.toArray(sceneSelector);

  let triggerCount = 0;

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

  resolvedScenes.forEach((scene) => {
    const targets = scene.querySelectorAll(itemSelector);

    if (!targets.length) {
      return;
    }

    if (scene.getBoundingClientRect().top <= window.innerHeight * initialThreshold) {
      animateScene(scene);
    }

    motionScrollTrigger.create({
      trigger: scene,
      start,
      once: true,
      onEnter: () => animateScene(scene)
    });

    triggerCount += 1;
  });

  if (triggerCount) {
    requestAnimationFrame(() => motionScrollTrigger.refresh());
  }
}
