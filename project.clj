(defproject markdown-clj "1.12.14-SNAPSHOT"
  :description "Markdown parser"
  :url "https://github.com/yogthos/markdown-clj"
  :license {:name "Eclipse Public License"
            :url  "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.10.3"]
                 [clj-commons/clj-yaml "1.0.29"]]
  :clojurescript? true
  :jar-exclusions [#"\.swp|\.swo|\.DS_Store"]
  :test-selectors {:default   (complement :benchmark)
                   :benchmark :benchmark
                   :all       (constantly true)}
  :auto-clean false
  :pom-location "target/"

  :aliases {"test-cljs" ["shell" "bb" "test:cljs"]
            "test-bb"   ["shell" "bb" "test:bb"]
            "test-nbb"  ["shell" "bb" "test:nbb"]
            "test"      ["do" "test," "test-cljs," "test-bb," "test-nbb"]
            "cleantest" ["do" "clean," "test"]
            "build-js"  ["with-profile" "js" "cljsbuild" "once" "main"]
            "jar"       ["do" "build-js," "jar"]
            "install"   ["do" "clean," "build-js," "install"]
            "deploy"    ["do" "clean," "build-js," "deploy" "clojars"]}

  :source-paths ["src/clj" "src/cljc" "src/cljs"]
  :resource-paths ["target/generated-resources"]

  :profiles
  {:dev
   {:jvm-opts ["-XX:-TieredCompilation"]
    :plugins [[lein-shell "0.4.1"]]
    :dependencies [[criterium "0.4.6" :scope "test"]
                   [commons-lang "2.6" :scope "test"]]}
   :js
   {:plugins [[lein-cljsbuild "1.1.8"]]
    :dependencies [[org.clojure/clojurescript "1.11.132"]]
    :cljsbuild
    {:builds {:main
              {:source-paths ["src/cljc" "src/cljs"]
               :jar          true
               :compiler     {:output-to     "target/generated-resources/js/markdown-clj.js"
                              :optimizations :advanced
                              :pretty-print  false}}
              :dev
              {:compiler {:optimizations :whitespace
                          :pretty-print  true}}}}}})
