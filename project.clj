(defproject markdown-clj "1.0.2"
  :description "Markdown parser"
  :url "https://github.com/yogthos/markdown-clj"
  :license {:name "Eclipse Public License"
            :url  "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.8.0"]]
  :clojurescript? true
  :jar-exclusions [#"\.swp|\.swo|\.DS_Store"]
  :test-selectors {:default   (complement :benchmark)
                   :benchmark :benchmark
                   :all       (constantly true)}
  :auto-clean false

   :aliases {"test-cljs" ["doo" "rhino" "test" "once"]
             "test"      ["do" "test," "test-cljs"]
             "cleantest" ["do" "clean," "test"]
             "install"   ["do" "clean," "install"]
             "deploy"    ["do" "clean," "deploy" "clojars"]}

  :source-paths ["src/clj" "src/cljc" "src/cljs"]
  :cljsbuild
  {:builds {:main
            {:source-paths ["src/cljc" "src/cljs"]
             :jar          true
             :compiler     {:output-to     "demo/js/markdown.js"
                            :optimizations :advanced
                            :pretty-print  false}}
            :dev
            {:compiler {:optimizations :whitespace
                        :pretty-print  true}}

            :test
            {:source-paths ["src/cljc" "src/cljs" "test"]
             :compiler {:output-to "target/unit-test.js"
                        :output-dir "target"
                        :main mdrunner.test
                        :optimizations :whitespace}}}}
  :profiles
  {:demo
   {}
   :dev
   {:jvm-opts ["-XX:-TieredCompilation"]
    :dependencies [[criterium "0.4.4" :scope "test"]
                   [commons-lang "2.6" :scope "test"]
                   [org.clojure/clojurescript "1.9.293"]
                   [org.mozilla/rhino "1.7.7"]]
    :plugins      [[lein-cljsbuild "1.1.3"]
                   [lein-doo "0.1.6"]]}}
  :doo {:paths {:rhino "lein run -m org.mozilla.javascript.tools.shell.Main"}})
