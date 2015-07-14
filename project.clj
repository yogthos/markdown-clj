(defproject markdown-clj "0.9.67"
  :description "Markdown parser"
  :url "https://github.com/yogthos/markdown-clj"
  :license {:name "Eclipse Public License"
            :url  "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.7.0"]]
  :clojurescript? true
  :source-paths ["src/cljc" "src/cljs" "src/clj"]
  :jar-exclusions [#"|\.swp|\.swo|\.DS_Store"]
  :test-selectors {:default   (complement :benchmark)
                   :benchmark :benchmark
                   :all       (constantly true)}
  :auto-clean false
  :aliases {"cleantest" ["do" "clean," "test"]
            "install"   ["do" "clean," "install"]
            "deploy"    ["do" "clean," "deploy" "clojars"]}
  :cljsbuild
  {:builds {:main {:source-paths ["src/cljs"]
                   :jar          true
                   :compiler     {:output-to     "js/markdown.js"
                                  :optimizations :advanced
                                  :pretty-print  false}}
            :dev  {:compiler {:optimizations :whitespace
                              :pretty-print  true}}}}
  :profiles {:1.7 {:dependencies [[org.clojure/clojure "1.7.0"]]}
             :dev {:dependencies [[criterium "0.4.3" :scope "test"]
                                  [commons-lang "2.6" :scope "test"]
                                  [org.clojure/clojurescript "0.0-3308"]]
                   :plugins      [[lein-cljsbuild "1.0.3"]]}})
