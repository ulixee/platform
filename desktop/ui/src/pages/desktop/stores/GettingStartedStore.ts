import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useReplaysStore } from '@/pages/desktop/stores/ReplaysStore';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';

export const useGettingStartedStore = defineStore('gettingStartedStore', () => {
  const completedSteps = ref(new Set<string>());

  const steps = ref<{ name: string; description: string; href: string; isComplete: boolean }[]>([
    {
      name: 'Create a Hero Script',
      description: 'Hero is a dead simple way to automate the web.',
      href: 'hero',
    },
    {
      name: 'Debug your Hero script with ChromeAlive',
      description: "See how easy we've made it to troubleshoot scraping bugs.",
      href: 'chromealive',
    },
    {
      name: 'Convert your Hero script to a Datastore',
      description: 'Datastores add structure and sql querying to your Hero scripts.',
      href: 'datastore',
    },
    {
      name: 'Query your Datastore with SQL',
      description: 'Datastores let you query them with the SQL you already know!',
      href: 'query',
    },
    {
      name: 'Add payment to your Datastore',
      description: 'Datastores support payment out of the box.',
      href: 'payment',
    },
    {
      name: 'Deploy your Datastore',
      description: 'You can deploy in one step to our public cloud, or to your own server.',
      href: 'deploy',
    },
    {
      name: 'Create a Shareable Credit',
      description: 'Create a credit - you can send it to a friend or test yourself.',
      href: 'credit',
    },
    {
      name: 'Clone a Datastore',
      description: 'Datastores can be cloned and extended without exposing the code.',
      href: 'clone',
    },
  ] as any);

  for (const step of steps.value) {
    (step as any).isComplete = computed(() => completedSteps.value.has(step.href));
  }

  const router = useRouter();
  function gotoNextIncompleteStep() {
    let nextStep = 0;
    for (let i = 0; i < steps.value.length; i += 1) {
      if (completedSteps.value.has(steps.value[i].href)) {
        nextStep += 1;
      }
    }
    void router.push(`/getting-started/${steps.value[nextStep].href}`);
  }

  function markStepComplete(step: string) {
    completedSteps.value.add(step);
    void window.desktopApi.send('GettingStarted.completeStep', step);
  }

  function gotoNextStep(name: string) {
    let didMatch = false;
    for (const step of steps.value) {
      if (didMatch) {
        void router.push(`/getting-started/${step.href}`);
        return;
      }
      if (step.href === name) {
        didMatch = true;
      }
    }
  }

  const stepCompletion: { [key: string]: (done: () => void) => any } = {
    hero(done) {
      const ReplaysStore = useReplaysStore();
      const { sessions } = storeToRefs(ReplaysStore);
      const hasCreatedSession = watch(sessions.value, value => {
        if (value.some(x => x.scriptEntrypoint.includes('ulixee.org.'))) {
          hasCreatedSession();
          done();
        }
      });
    },
    chromealive(done) {
      const ReplaysStore = useReplaysStore();

      const { lastOpenReplay } = storeToRefs(ReplaysStore);
      const stopWatch = watch(lastOpenReplay, value => {
        if (value.scriptEntrypoint.includes('ulixee.org.')) {
          stopWatch();
          done();
        }
      });
    },
    datastore(done) {
      const datastoreStore = useDatastoreStore();
      const { datastoresById } = storeToRefs(datastoreStore);
      const stopWatch = watch(datastoresById.value, value => {
        if (Object.values(value).some(x => x.summary.scriptEntrypoint.includes('ulixee.org.'))) {
          stopWatch();
          done();
        }
      });
    },
    query(done) {
      const datastoreStore = useDatastoreStore();
      const { datastoresById } = storeToRefs(datastoreStore);
      const stopWatch = watch(datastoresById.value, value => {
        for (const entry of Object.values(value)) {
          if (
            entry.summary.scriptEntrypoint.includes('ulixee.org.') &&
            entry.summary.stats.queries > 0
          ) {
            stopWatch();
            done();
          }
        }
      });
    },
    payment(done) {
      const datastoreStore = useDatastoreStore();
      const { datastoresById } = storeToRefs(datastoreStore);
      const stopWatch = watch(datastoresById.value, value => {
        for (const entry of Object.values(value)) {
          if (
            entry.summary.scriptEntrypoint.includes('ulixee.org.') &&
            entry.details &&
            Object.values(entry.details.extractorsByName).some(x => x.basePrice > 0)
          ) {
            stopWatch();
            done();
          }
        }
      });
    },
    deploy(done) {
      const datastoreStore = useDatastoreStore();
      const { datastoresById } = storeToRefs(datastoreStore);
      const stopWatch = watch(datastoresById.value, value => {
        for (const entry of Object.values(value)) {
          if (
            entry.summary.scriptEntrypoint.includes('ulixee.org.') &&
            Object.values(entry.cloudsByVersion).some(x => !x.includes('local'))
          ) {
            stopWatch();
            done();
          }
        }
      });
    },
    credit(done) {
      const datastoreStore = useDatastoreStore();
      const { datastoresById } = storeToRefs(datastoreStore);
      const stopWatch = watch(datastoresById.value, value => {
        for (const entry of Object.values(value)) {
          if (
            entry.summary.scriptEntrypoint.includes('ulixee.org.') &&
            entry.createdCredits.length
          ) {
            stopWatch();
            done();
          }
        }
      });
    },
    clone(done) {
      const datastoreStore = useDatastoreStore();
      const { datastoresById } = storeToRefs(datastoreStore);
      const stopWatch = watch(datastoresById.value, value => {
        for (const entry of Object.values(value)) {
          if (
            entry.summary.name === 'Ulixee Docs v2' &&
            Object.values(entry.cloudsByVersion).some(x => x.includes('local'))
          ) {
            stopWatch();
            done();
          }
        }
      });
    },
  };

  (async () => {
    const userCompletedSteps = await window.desktopApi.send('GettingStarted.getCompletedSteps');
    for (const step of userCompletedSteps) completedSteps.value.add(step);
    for (const [key, callback] of Object.entries(stepCompletion)) {
      if (!completedSteps.value.has(key)) {
        callback(() => markStepComplete(key));
      }
    }
    gotoNextIncompleteStep();
  })().catch(console.error);

  return {
    gotoNextStep,
    gotoNextIncompleteStep,
    steps,
  };
});
