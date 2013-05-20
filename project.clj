(defproject markdown-clj "0.9.23"
  :clojurescript? true
  :description "Markdown parser"
   :url "https://github.com/yogthos/markdown-clj"
   :license {:name "Eclipse Public License"
             :url "http://www.eclipse.org/legal/epl-v10.html"}
   :dependencies [[org.clojure/clojure "1.5.1"]
                  [criterium "0.3.1" :scope "test"]]
   :plugins [[lein-cljsbuild "0.3.2"]]
   :hooks [leiningen.cljsbuild]
   :test-selectors {:default (complement :benchmark)
                    :benchmark :benchmark
                    :all (constantly true)}
   
   :cljsbuild
   {:crossovers [markdown.transformers]
    :crossover-path "src-cljs"
    :output-to "js/markdown.js"
    :builds
    {:dev  {:source-paths ["src-cljs"]
             :compiler {:output-to "target/main.js"
                        :optimizations :whitespace
                        :pretty-print true}}}})
