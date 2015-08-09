(defproject markdown-clj "0.9.68"
  :description "Markdown parser"
  :url "https://github.com/yogthos/markdown-clj"
  :license {:name "Eclipse Public License"
            :url  "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.7.0"]]
  :clojurescript? true
  :jar-exclusions [#"\.swp|\.swo|\.DS_Store"]
  :test-selectors {:default   (complement :benchmark)
                   :benchmark :benchmark
                   :all       (constantly true)}
  :auto-clean false

  :aliases {"cleantest" ["do" "clean," "test"]
            "install"   ["do" "clean," "install"]
            "deploy"    ["do" "clean," "deploy" "clojars"]}

  :source-paths ["src/clj" "src/cljc" "src/cljs"]
  :cljsbuild
  {:builds {:main
            {:source-paths ["src/cljc" "src/cljs"]
             :jar          true
             :compiler     {:output-to     "js/markdown.js"
                            :optimizations :advanced
                            :pretty-print  false}}
            :dev
            {:compiler {:optimizations :whitespace
                        :pretty-print  true}}}}
  :profiles
  {:dev
   {:dependencies [[criterium "0.4.3" :scope "test"]
                   [commons-lang "2.6" :scope "test"]
                   [org.clojure/clojurescript "1.7.58"]]
    :plugins      [[lein-cljsbuild "1.0.6"]]}})
