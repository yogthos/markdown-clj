(ns mdtest.runner
  (:require [doo.runner :refer-macros [doo-tests]]
            [mdtests]))

(doo-tests 'mdtests)
