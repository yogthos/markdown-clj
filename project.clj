(defproject markdown-clj "0.9.49"
            :description "Markdown parser"
            :url "https://github.com/yogthos/markdown-clj"
            :license {:name "Eclipse Public License"
                      :url "http://www.eclipse.org/legal/epl-v10.html"}
            :dependencies [[org.clojure/clojure "1.6.0"]]
            :clojurescript? true
            :source-paths ["src" "src-cljs" "src-cljx" "target/generated/clj" "target/generated/cljs"]
            :jar-exclusions [#"\.cljx|\.swp|\.swo|\.DS_Store"]
            :test-selectors {:default (complement :benchmark)
                             :benchmark :benchmark
                             :all (constantly true)}

            :cljsbuild
            {:builds {:main
                       {:source-paths ["src-cljs" "target/generated/cljs"]
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
                   :plugins [[lein-cljsbuild "1.0.3"]
                             [com.keminglabs/cljx "0.4.0"]]
                   :cljx {:builds [{:source-paths ["src-cljx"]
                                    :output-path "target/generated/clj"
                                    :rules :clj}
                                   {:source-paths ["src-cljx"]
                                    :output-path "target/generated/cljs"
                                    :rules :cljs}]}
                   :aliases {"cleantest" ["do" "clean," "cljx" "once," "test,"]
                             "install" ["do" "clean," "cljx" "once," "install"]
                             "deploy" ["do" "clean," "cljx" "once," "deploy" "clojars"]}}})