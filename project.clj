(defproject markdown-clj "0.9.49"
  :description "Markdown parser"
   :url "https://github.com/yogthos/markdown-clj"
   :license {:name "Eclipse Public License"
             :url "http://www.eclipse.org/legal/epl-v10.html"}
   :dependencies [[org.clojure/clojure "1.6.0"]]
   :clojurescript? true
   :source-paths ["src" "src-cljs"]
   :test-selectors {:default (complement :benchmark)
                    :benchmark :benchmark
                    :all (constantly true)}
   :cljsbuild
   {:crossovers [markdown.transformers]
    :crossover-path "crossover"
    :crossover-jar true

    :builds {:main
             {:source-paths ["src-cljs"]
              :jar true
              :compiler {:output-to "js/markdown.js"
                         :optimizations :advanced
                         :pretty-print false}}
             :dev
             {:compiler {:optimizations :whitespace
                         :pretty-print true}}}}
  :profiles
  {:1.5 {:dependencies [[org.clojure/clojure "1.5.1"]]}
   :dev
        {:dependencies [[criterium "0.4.3" :scope "test"]
                        [commons-lang "2.6" :scope "test"]
                        [org.clojure/clojurescript "0.0-2322"]]
         :plugins [[lein-cljsbuild "1.0.3"]]}})


