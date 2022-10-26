# Changes to DataboxObject

Databox for Hero adds two additional properties to the  [DataboxObject](/docs/databox/databox-basics/databox-object), depending on which callback method is being executed.

## In the Standard run() Callback

### databoxObject.hero

Readonly access to a pre-initialized [Hero](/docs/hero/basic-client/hero) instance.

#### **Returns** [`Hero`](/docs/hero/basic-client/hero)

## In The onAfterHeroCompletes() Callback

### databoxObject.heroReplay

Readonly access to a pre-initialized [HeroReplay](/docs/hero/basic-client/hero-replay) instance.

#### **Returns** [`HeroReplay`](/docs/hero/basic-client/hero-replay)
